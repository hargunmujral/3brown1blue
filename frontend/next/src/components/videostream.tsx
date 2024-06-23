import React, { useEffect, useRef, useState } from "react";

interface VideoStreamProps {
  width: number;
  height: number;
}

const VideoStream: React.FC<VideoStreamProps> = ({ width, height }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isSocketOpen, setIsSocketOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<string>("");

  useEffect(() => {
    // Open WebSocket connection
    const ws = new WebSocket("ws://localhost:8000/ws");

    ws.onopen = () => {
      setIsSocketOpen(true);
      setSocket(ws);
    };

    ws.onmessage = (event) => {
      const result = JSON.parse(event.data);

      const jsonString = JSON.stringify(
        result?.face?.predictions
          ? result?.face?.predictions[0]?.emotions
              ?.sort((a: any, b: any) => b.score - a.score)
              .slice(0, 1)[0].name.replace(/""/g, '')
          : []

      );
      const parsedValue = JSON.parse(jsonString);
      const extractedValue = parsedValue.replace(/^"(.*)"$/, '$1');

      setMessages(extractedValue)

    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed");
      setIsSocketOpen(false);
    };

    return () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
            videoRef.current.style.transform = "scaleX(-1)"; // Mirror effect
          }
        })
        .catch((error) => {
          console.error("Error accessing webcam:", error);
        });
    }
  }, []);

  useEffect(() => {
    const captureFrame = () => {
      if (videoRef.current && socket && isSocketOpen) {
        const canvas = document.createElement("canvas");
        canvas.width = width; // Use width and height props directly
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (context) {
          context.drawImage(
            videoRef.current,
            0,
            0,
            canvas.width,
            canvas.height
          );
          const frameData = canvas.toDataURL("image/png");
          socket.send(frameData);
        }

        setTimeout(captureFrame, 1000); // Adjust interval as needed
      } else {
        setTimeout(captureFrame, 1000); // Retry after a delay
      }
    };

    captureFrame();
  }, [socket, isSocketOpen, width, height]); // Include width and height in dependencies

  return (
    <div>
      <video
        className="rounded-br-lg rounded-tl-lg"
        ref={videoRef}
        width={width}
        height={height}
        style={{ transform: "scaleX(-1)" }}
      ></video>
      { messages === "" ? <div></div> : <p style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          color: "white",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          padding: "5px",
          margin: "0",
        }}>{messages}</p>}
      
    </div>
  );
};

export default VideoStream;
