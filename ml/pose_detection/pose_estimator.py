"""
Real-time pose estimation and bicep curl rep counting module.
Based on and reusing the algorithms from raxor555/Bicep-Curl-Counter.

Features:
- Accurate joint angle calculation for bicep curls (shoulder-elbow-wrist)
- Support for Left Arm, Right Arm, and Auto-detection based on visibility
- State machine tracking arm stage ('down' > 160 deg, 'up' < 30 deg)
- OpenCV-styled status overlay matching the original layout
- Automatic logging of workout reps with timestamps
- Works seamlessly across MediaPipe 1.x (MediaPipe Tasks) and legacy 0.10.x (mp.solutions.pose)
"""

import argparse
import datetime
import math
import os
import sys
from pathlib import Path
import cv2
import numpy as np

# Thresholds from original raxor555/Bicep-Curl-Counter
DOWN_THRESHOLD = 160.0
UP_THRESHOLD = 30.0


def calculate_angle(a, b, c) -> float:
    """
    Calculates the angle between three points (a, b, c) at vertex b.
    Matches the exact trigonometric algorithm from raxor555/Bicep-Curl-Counter:
    radians = np.arctan2(c[1]-b[1], c[0]-b[0]) - np.arctan2(a[1]-b[1], a[0]-b[0])
    angle = np.abs(radians * 180.0 / np.pi)
    if angle > 180.0: angle = 360 - angle
    """
    a = np.array(a, dtype=np.float32)
    b = np.array(b, dtype=np.float32)
    c = np.array(c, dtype=np.float32)

    radians = np.arctan2(c[1] - b[1], c[0] - b[0]) - np.arctan2(a[1] - b[1], a[0] - b[0])
    angle = float(np.abs(radians * 180.0 / np.pi))

    if angle > 180.0:
        angle = 360.0 - angle

    return angle


class BicepCurlCounter:
    """
    Pose detector and repetition counter reusing the raxor555 algorithm.
    Resolves dependency conflicts across MediaPipe versions (1.x Tasks vs 0.10.x solutions).
    """

    def __init__(
        self,
        down_threshold: float = DOWN_THRESHOLD,
        up_threshold: float = UP_THRESHOLD,
        arm: str = "auto",  # 'left', 'right', or 'auto'
        log_file: str | None = None,
        model_path: str | None = None,
    ):
        self.down_threshold = down_threshold
        self.up_threshold = up_threshold
        self.arm = arm.lower()
        self.log_file = log_file

        self.counter = 0
        self.stage: str | None = None  # "down", "up", or None
        self.current_angle: float | None = None
        self.rep_logs: list[dict] = []
        self.active_arm = "left"

        self._init_mediapipe(model_path)

    def _init_mediapipe(self, model_path: str | None):
        import mediapipe as mp

        self.mp = mp
        self.is_tasks_api = hasattr(mp, "tasks") and hasattr(mp.tasks, "vision")

        if self.is_tasks_api:
            # Modern MediaPipe Tasks API
            BaseOptions = mp.tasks.BaseOptions
            PoseLandmarker = mp.tasks.vision.PoseLandmarker
            PoseLandmarkerOptions = mp.tasks.vision.PoseLandmarkerOptions
            VisionRunningMode = mp.tasks.vision.RunningMode

            if not model_path:
                default_path = Path(__file__).resolve().parent / "pose_landmarker_lite.task"
                if not default_path.exists():
                    # Attempt download if not present
                    import urllib.request
                    url = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task"
                    os.makedirs(default_path.parent, exist_ok=True)
                    urllib.request.urlretrieve(url, str(default_path))
                model_path = str(default_path)

            self.options = PoseLandmarkerOptions(
                base_options=BaseOptions(model_asset_path=model_path),
                running_mode=VisionRunningMode.IMAGE,
                min_pose_detection_confidence=0.5,
                min_tracking_confidence=0.5,
            )
            self.landmarker = PoseLandmarker.create_from_options(self.options)
            self.legacy_pose = None
        else:
            # Legacy solutions API
            self.mp_drawing = mp.solutions.drawing_utils
            self.mp_pose = mp.solutions.pose
            self.legacy_pose = self.mp_pose.Pose(
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5,
            )
            self.landmarker = None

    def process_frame(self, frame: np.ndarray, timestamp_ms: int = 0) -> tuple[np.ndarray, dict]:
        """
        Processes a single video frame:
        - Detects pose landmarks
        - Calculates elbow joint angle
        - Updates bicep curl repetition counter and stage
        - Draws status box and landmark overlay
        """
        height, width, _ = frame.shape
        metrics = {
            "reps": self.counter,
            "stage": self.stage,
            "angle": None,
            "arm": self.active_arm,
            "person_detected": False,
            "rep_just_completed": False,
        }

        landmarks_data = None

        if self.is_tasks_api and self.landmarker:
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = self.mp.Image(image_format=self.mp.ImageFormat.SRGB, data=frame_rgb)
            result = self.landmarker.detect(mp_image)
            if result.pose_landmarks and len(result.pose_landmarks) > 0:
                landmarks_data = result.pose_landmarks[0]
        elif self.legacy_pose:
            image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            image_rgb.flags.writeable = False
            results = self.legacy_pose.process(image_rgb)
            if results.pose_landmarks:
                landmarks_data = results.pose_landmarks.landmark

        if landmarks_data:
            metrics["person_detected"] = True

            # Extract left arm indices: 11 (shoulder), 13 (elbow), 15 (wrist)
            # Extract right arm indices: 12 (shoulder), 14 (elbow), 16 (wrist)
            l_shoulder = [landmarks_data[11].x, landmarks_data[11].y]
            l_elbow = [landmarks_data[13].x, landmarks_data[13].y]
            l_wrist = [landmarks_data[15].x, landmarks_data[15].y]
            l_vis = getattr(landmarks_data[13], "visibility", 1.0) or 1.0

            r_shoulder = [landmarks_data[12].x, landmarks_data[12].y]
            r_elbow = [landmarks_data[14].x, landmarks_data[14].y]
            r_wrist = [landmarks_data[16].x, landmarks_data[16].y]
            r_vis = getattr(landmarks_data[14], "visibility", 1.0) or 1.0

            # Determine which arm to track
            if self.arm == "left":
                shoulder, elbow, wrist = l_shoulder, l_elbow, l_wrist
                self.active_arm = "left"
            elif self.arm == "right":
                shoulder, elbow, wrist = r_shoulder, r_elbow, r_wrist
                self.active_arm = "right"
            else:
                # Auto-detect arm with higher confidence / visibility
                if r_vis > l_vis:
                    shoulder, elbow, wrist = r_shoulder, r_elbow, r_wrist
                    self.active_arm = "right"
                else:
                    shoulder, elbow, wrist = l_shoulder, l_elbow, l_wrist
                    self.active_arm = "left"

            metrics["arm"] = self.active_arm

            # Calculate elbow angle
            angle = calculate_angle(shoulder, elbow, wrist)
            self.current_angle = round(angle, 1)
            metrics["angle"] = self.current_angle

            # Visualize angle at elbow
            elbow_pixel = (int(elbow[0] * width), int(elbow[1] * height))
            cv2.putText(
                frame,
                f"{angle:.1f}",
                elbow_pixel,
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (255, 255, 255),
                2,
                cv2.LINE_AA,
            )

            # Curl counter logic from original bicepcurl.py
            if angle > self.down_threshold:
                self.stage = "down"
            if angle < self.up_threshold and self.stage == "down":
                self.stage = "up"
                self.counter += 1
                metrics["rep_just_completed"] = True
                metrics["reps"] = self.counter

                now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                log_entry = {
                    "rep": self.counter,
                    "timestamp": now_str,
                    "angle": self.current_angle,
                    "arm": self.active_arm,
                }
                self.rep_logs.append(log_entry)
                print(f"Curl {self.counter} at {now_str} (Arm: {self.active_arm}, Angle: {angle:.1f})")

                if self.log_file:
                    try:
                        with open(self.log_file, "a") as f:
                            f.write(f"{now_str}: Curl {self.counter} ({self.active_arm} arm, {angle:.1f} deg)\n")
                    except Exception as e:
                        print(f"Logging error: {e}")

            metrics["stage"] = self.stage

            # Draw landmarks overlay
            self._draw_landmarks(frame, landmarks_data, width, height)

        else:
            cv2.putText(
                frame,
                "No person detected",
                (10, 100),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.8,
                (0, 0, 255),
                2,
                cv2.LINE_AA,
            )

        # Render curl counter status box matching bicepcurl.py layout
        # Status box rectangle with BGR color (245, 117, 16)
        cv2.rectangle(frame, (0, 0), (260, 73), (245, 117, 16), -1)

        # Rep data
        cv2.putText(frame, "REPS", (15, 14), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 1, cv2.LINE_AA)
        cv2.putText(frame, str(self.counter), (12, 60), cv2.FONT_HERSHEY_SIMPLEX, 1.8, (255, 255, 255), 2, cv2.LINE_AA)

        # Stage data
        cv2.putText(frame, "STAGE", (90, 14), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 1, cv2.LINE_AA)
        cv2.putText(
            frame,
            (self.stage or "N/A").upper(),
            (85, 60),
            cv2.FONT_HERSHEY_SIMPLEX,
            1.4,
            (255, 255, 255),
            2,
            cv2.LINE_AA,
        )

        # Active Arm data
        cv2.putText(frame, "ARM", (185, 14), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 1, cv2.LINE_AA)
        cv2.putText(
            frame,
            self.active_arm.upper(),
            (185, 60),
            cv2.FONT_HERSHEY_SIMPLEX,
            1.0,
            (255, 255, 255),
            2,
            cv2.LINE_AA,
        )

        return frame, metrics

    def _draw_landmarks(self, frame: np.ndarray, landmarks, width: int, height: int):
        """Draws pose joints and connections with original raxor555 colors."""
        connections = [
            (11, 13), (13, 15),  # Left arm
            (12, 14), (14, 16),  # Right arm
            (11, 12),            # Shoulders
            (11, 23), (12, 24),  # Torso
            (23, 24),            # Hips
        ]

        # Draw connection lines (BGR (245, 66, 230))
        for p1_idx, p2_idx in connections:
            if p1_idx < len(landmarks) and p2_idx < len(landmarks):
                p1 = landmarks[p1_idx]
                p2 = landmarks[p2_idx]
                pt1 = (int(p1.x * width), int(p1.y * height))
                pt2 = (int(p2.x * width), int(p2.y * height))
                cv2.line(frame, pt1, pt2, (245, 66, 230), 2)

        # Draw landmark circles (BGR (245, 117, 66))
        for idx in [11, 12, 13, 14, 15, 16, 23, 24]:
            if idx < len(landmarks):
                p = landmarks[idx]
                pt = (int(p.x * width), int(p.y * height))
                cv2.circle(frame, pt, 4, (245, 117, 66), -1)
                cv2.circle(frame, pt, 5, (255, 255, 255), 1)

    def close(self):
        if self.landmarker:
            self.landmarker.close()
        if self.legacy_pose:
            self.legacy_pose.close()


def main():
    parser = argparse.ArgumentParser(description="ElevateFit AI Bicep Curl Counter")
    parser.add_argument("--video", type=str, default=None, help="Path to video file (default: webcam 0)")
    parser.add_argument("--arm", type=str, default="auto", choices=["auto", "left", "right"], help="Arm to track")
    parser.add_argument("--log", type=str, default="workout_log.txt", help="Log output file")
    args = parser.parse_args()

    source = args.video if args.video else 0
    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        print(f"Error: Could not open video source {source}.")
        sys.exit(1)

    counter = BicepCurlCounter(arm=args.arm, log_file=args.log)
    print("AI Bicep Curl Counter running... Press 'q' to quit.")

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        frame, metrics = counter.process_frame(frame)
        cv2.imshow("ElevateFit AI Bicep Curl Counter", frame)

        if cv2.waitKey(10) & 0xFF == ord("q"):
            break

    counter.close()
    cap.release()
    cv2.destroyAllWindows()
    print(f"\nWorkout finished! Total bicep curls completed: {counter.counter}")


if __name__ == "__main__":
    main()
