import { Download, FileText } from "lucide-react";
import type { MoodleFileContent } from "@/api/types";
import { fileUrl } from "@/api/transport";
import { formatSize, isImage, isPdf } from "@/lib/format";
import { cx } from "@/lib/cx";

/** Превью изображений и список файлов на скачивание с токеном веб-сервиса. */
export function FileList({
  files,
  token,
  compact,
}: {
  files: MoodleFileContent[];
  token: string;
  compact?: boolean;
}) {
  if (!files || files.length === 0) return null;

  const images = files.filter((f) => isImage(f.mimetype));
  const rest = files.filter((f) => !isImage(f.mimetype));

  return (
    <div className={cx("flex flex-col gap-3", compact ? "mt-2" : "mt-3")}>
      {images.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {images.map((file) => (
            <a
              key={file.fileurl}
              href={fileUrl(file.fileurl, token)}
              target="_blank"
              rel="noreferrer"
              title={file.filename}
              className="group relative overflow-hidden rounded-card border border-line"
            >
              <img
                src={fileUrl(file.fileurl, token)}
                alt={file.filename}
                loading="lazy"
                className={cx(
                  "w-auto object-cover transition-transform duration-500 group-hover:scale-[1.03]",
                  compact ? "h-20 max-w-[180px]" : "h-32 max-w-[280px]",
                )}
              />
            </a>
          ))}
        </div>
      )}

      {rest.map((file) => (
        <a
          key={file.fileurl}
          href={fileUrl(file.fileurl, token)}
          target="_blank"
          rel="noreferrer"
          className="group inline-flex items-center gap-3 text-body-sm text-muted transition-colors duration-300 hover:text-cream"
        >
          {isPdf(file.mimetype) ? (
            <FileText className="h-4 w-4 shrink-0" strokeWidth={1.5} />
          ) : (
            <Download className="h-4 w-4 shrink-0" strokeWidth={1.5} />
          )}
          <span className="truncate">{file.filename}</span>
          {file.filesize > 0 && (
            <span className="shrink-0 text-caption text-muted/70">
              {formatSize(file.filesize)}
            </span>
          )}
        </a>
      ))}
    </div>
  );
}
