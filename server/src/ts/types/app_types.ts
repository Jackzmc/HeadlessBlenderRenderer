type FrameDuration = number
type StopReason = "CANCELLED" | "OUT_OF_TOKENS" | "ERROR" | "SHUTTING_DOWN"
type EventName = "render_start" | "render_stop" | "frame" | "log" | "stat"
type RenderFormat = "TGA" | "RAWTGA" | "JPEG" | "IRIS" | "IRIZ" | "AVIRAW" | "AVIJPEG" | "PNG" | "BMP"