import { useState, useEffect } from "react";

/**
 * DeviceCheck component to verify microphone availability and permissions
 * Helps diagnose audio device issues before connecting to LiveKit
 */
export const DeviceCheck = () => {
  const [deviceStatus, setDeviceStatus] = useState<{
    hasPermission: boolean | null;
    hasDevices: boolean | null;
    error: string | null;
    devices: MediaDeviceInfo[];
  }>({
    hasPermission: null,
    hasDevices: null,
    error: null,
    devices: [],
  });

  const checkDevicesAndPermissions = async () => {
    try {
      // First, check if mediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setDeviceStatus({
          hasPermission: false,
          hasDevices: false,
          error: "Media devices API not available (requires HTTPS)",
          devices: [],
        });
        return;
      }

      // Check available devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputDevices = devices.filter(
        (device) => device.kind === "audioinput"
      );

      // Try to get microphone permission and access
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });

        // Stop the stream immediately
        stream.getTracks().forEach((track) => track.stop());

        setDeviceStatus({
          hasPermission: true,
          hasDevices: audioInputDevices.length > 0,
          error: null,
          devices: audioInputDevices,
        });
      } catch (permissionError) {
        const error = permissionError as Error;
        setDeviceStatus({
          hasPermission: false,
          hasDevices: audioInputDevices.length > 0,
          error: `Permission error: ${error.message}`,
          devices: audioInputDevices,
        });
      }
    } catch (error) {
      setDeviceStatus({
        hasPermission: null,
        hasDevices: null,
        error: `Device check failed: ${(error as Error).message}`,
        devices: [],
      });
    }
  };

  useEffect(() => {
    checkDevicesAndPermissions();
  }, []);

  const getStatusColor = () => {
    if (deviceStatus.hasPermission && deviceStatus.hasDevices) {
      return "text-green-600";
    }
    if (deviceStatus.error) {
      return "text-red-600";
    }
    return "text-yellow-600";
  };

  const getStatusText = () => {
    if (deviceStatus.hasPermission === null) return "Checking devices...";
    if (deviceStatus.error) return "Device check failed";
    if (!deviceStatus.hasDevices) return "No microphone found";
    if (!deviceStatus.hasPermission) return "Permission required";
    return "Ready for audio";
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-3">
        Audio Device Status
      </h3>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Status:</span>
          <span className={`font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-600">Permission:</span>
          <span className={`text-sm ${getStatusColor()}`}>
            {deviceStatus.hasPermission === null
              ? "Checking..."
              : deviceStatus.hasPermission
              ? "✓ Granted"
              : "✗ Denied"}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-600">Devices:</span>
          <span className={`text-sm ${getStatusColor()}`}>
            {deviceStatus.hasDevices === null
              ? "Checking..."
              : `${deviceStatus.devices.length} found`}
          </span>
        </div>

        {deviceStatus.error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {deviceStatus.error}
          </div>
        )}

        {deviceStatus.devices.length > 0 && (
          <div className="mt-3">
            <span className="text-gray-600 text-sm">
              Available microphones:
            </span>
            <ul className="mt-1 text-sm text-gray-700">
              {deviceStatus.devices.map((device, index) => (
                <li key={device.deviceId} className="truncate">
                  • {device.label || `Microphone ${index + 1}`}
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          onClick={checkDevicesAndPermissions}
          className="mt-3 w-full px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
        >
          Refresh Device Check
        </button>
      </div>
    </div>
  );
};
