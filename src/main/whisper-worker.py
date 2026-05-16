#!/usr/bin/env python3
"""
Persistent faster-whisper subprocess worker.
Loads model once, listens on stdin for JSON {"audio_path": "...", "id": "..."},
transcribes, returns JSON {"id": "...", "text": "..."} to stdout,
deletes temp audio file. After loading model, prints 'READY' to stdout.
Keeps alive after transcription.
"""

import json
import os
import sys

from faster_whisper import WhisperModel


def main():
    # Load Whisper model once at startup
    model = WhisperModel("base", device="cpu", compute_type="int8")
    print("READY", flush=True)

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            payload = json.loads(line)
            audio_path = payload.get("audio_path")
            task_id = payload.get("id", "")
        except json.JSONDecodeError:
            result = {"error": "invalid JSON", "id": ""}
            print(json.dumps(result), flush=True)
            continue

        if not audio_path:
            result = {"error": "missing audio_path", "id": task_id}
            print(json.dumps(result), flush=True)
            continue

        try:
            # Transcribe
            segments, _ = model.transcribe(audio_path, language="en")
            text = "".join(segment.text for segment in segments)
            result = {"id": task_id, "text": text.strip()}
        except Exception as e:
            result = {"id": task_id, "error": str(e)}
        finally:
            # Delete temp audio file if it exists
            if os.path.exists(audio_path):
                try:
                    os.remove(audio_path)
                except OSError:
                    pass

        print(json.dumps(result), flush=True)


if __name__ == "__main__":
    main()
