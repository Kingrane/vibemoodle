import { fileUrl } from "@/api/transport";
import type { MoodleFileContent } from "@/api/types";

/**
 * Встроенный просмотр файлов, которые нормально открываются прямо на странице:
 * PDF и видео. Картинки показывает FileList (превью + клик), поэтому их тут нет.
 */
export function FilePreviewFrames({
  files,
  token,
}: {
  files: MoodleFileContent[];
  token: string;
}) {
  const previewable = files.filter(
    (f) =>
      f.mimetype === "application/pdf" ||
      f.mimetype?.startsWith("video/mp4") ||
      f.mimetype?.startsWith("video/webm"),
  );

  if (previewable.length === 0) return null;

  return (
    <div className="mt-6 flex flex-col gap-6">
      {previewable.map((file) => (
        <figure key={file.fileurl} className="flex flex-col gap-2">
          <div className="overflow-hidden rounded-card border border-line">
            {file.mimetype?.startsWith("video/") ? (
              <video
                controls
                preload="metadata"
                src={fileUrl(file.fileurl, token)}
                className="max-h-[70vh] w-full bg-panel"
              />
            ) : (
              <iframe
                title={file.filename}
                src={fileUrl(file.fileurl, token)}
                className="h-[70vh] w-full bg-panel"
              />
            )}
          </div>
          <figcaption className="text-caption text-muted">
            {file.filename}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
