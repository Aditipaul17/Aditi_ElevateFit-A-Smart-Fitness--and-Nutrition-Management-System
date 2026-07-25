"""
Real-time pose estimation and rep counting for the Pose Detection module.

This is a working starting point, not a finished production service:
it wraps MediaPipe's Pose solution, tracks a joint angle over time, and
counts reps for a single exercise (bicep curl) as a template you can
extend to squats, push-ups, etc.

Usage:
    python pose_estimator.py            # runs on the default webcam
    python pose_estimator.py --video path/to/file.mp4

To serve this from the FastAPI backend, wrap `PoseEstimator.process_frame`
behind a websocket endpoint that streams frames from the browser and
returns landmark + rep-count data as JSON.
"""

import argparse
import math

import cv2
import mediapipe as mp

mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils


def calculate_angle(a, b, c) -> float:
    """Returns the angle at point b, given three (x, y) points."""
    a, b, c = map(lambda p: (p.x, p.y), (a, b, c))
    radians = math.atan2(c[1] - b[1], c[0] - b[0]) - math.atan2(a[1] - b[1], a[0] - b[0])
    angle = abs(radians * 180.0 / math.pi)
    return 360 - angle if angle > 180 else angle


class PoseEstimator:
    def __init__(self, up_threshold: float = 160, down_threshold: float = 40):
        self.pose = mp_pose.Pose(
            min_detection_confidence=0.6,
            min_tracking_confidence=0.6,
        )
        self.up_threshold = up_threshold
        self.down_threshold = down_threshold
        self.rep_count = 0
        self.stage = "up"  # "up" or "down"

    def process_frame(self, frame):
        """Runs pose detection on a single BGR frame.

        Returns (annotated_frame, metrics) where metrics contains the
        current elbow angle, rep count, and a simple form-quality flag.
        """
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.pose.process(rgb)

        metrics = {
            "landmarks_detected": False,
            "angle": None,
            "reps": self.rep_count,
            "form_ok": True,
        }

        if results.pose_landmarks:
            landmarks = results.pose_landmarks.landmark
            shoulder = landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value]
            elbow = landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value]
            wrist = landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value]

            angle = calculate_angle(shoulder, elbow, wrist)
            metrics["landmarks_detected"] = True
            metrics["angle"] = round(angle, 1)

            if angle > self.up_threshold:
                self.stage = "up"
            if angle < self.down_threshold and self.stage == "up":
                self.stage = "down"
                self.rep_count += 1
                metrics["reps"] = self.rep_count

            mp_drawing.draw_landmarks(
                frame, results.pose_landmarks, mp_pose.POSE_CONNECTIONS
            )

        return frame, metrics

    def close(self):
        self.pose.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", type=str, default=None, help="Path to a video file")
    args = parser.parse_args()

    source = args.video if args.video else 0
    cap = cv2.VideoCapture(source)
    estimator = PoseEstimator()

    while cap.isOpened():
        ok, frame = cap.read()
        if not ok:
            break

        frame, metrics = estimator.process_frame(frame)
        cv2.putText(
            frame,
            f"Reps: {metrics['reps']}",
            (20, 40),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            (45, 106, 79),
            2,
        )
        cv2.imshow("ElevateFit Pose Detection", frame)

        if cv2.waitKey(10) & 0xFF == ord("q"):
            break

    estimator.close()
    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
