"use client";

import { useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import {
  Bold, Italic, List, ListOrdered, Heading2, Heading3,
  Quote, Minus, Undo, Redo, ImageIcon, LinkIcon, X, Upload, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  className?: string;
}

type Level = 1 | 2 | 3 | 4 | 5 | 6;

function ImageDialog({ onInsert, onClose }: { onInsert: (url: string, alt: string) => void; onClose: () => void }) {
  const [tab, setTab] = useState<"url" | "upload">("upload");
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (file.size > 5 * 1024 * 1024) { toast.error("Ukuran file maksimal 5MB"); return; }
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", "content");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Upload gagal"); setPreview(null); return; }
      setUploadedUrl(data.url);
    } catch {
      toast.error("Upload gagal, coba lagi");
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">Sisipkan Gambar</h3>
          <button type="button" onClick={onClose} className="p-1 hover:bg-muted rounded">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border rounded-lg overflow-hidden mb-4 text-xs">
          <button
            type="button"
            onClick={() => setTab("upload")}
            className={cn("flex-1 py-1.5 font-medium transition-colors", tab === "upload" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
          >
            Upload File
          </button>
          <button
            type="button"
            onClick={() => setTab("url")}
            className={cn("flex-1 py-1.5 font-medium transition-colors", tab === "url" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
          >
            Dari URL
          </button>
        </div>

        {tab === "upload" ? (
          <div className="space-y-3">
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
            {preview ? (
              <div className="relative rounded-lg overflow-hidden border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="preview" className="w-full max-h-40 object-contain" />
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  </div>
                )}
                {!uploading && (
                  <button type="button" onClick={() => { setPreview(null); setUploadedUrl(null); }}
                    className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white hover:bg-black/80">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()}
                className="w-full h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:border-primary/50 hover:bg-muted/30 transition-colors">
                <Upload className="h-5 w-5" />
                <span className="text-xs">Klik untuk pilih gambar</span>
                <span className="text-[10px] opacity-60">JPG, PNG, WebP, GIF — maks. 5MB</span>
              </button>
            )}
            <div>
              <label className="block text-xs font-medium mb-1">Alt text (opsional)</label>
              <input className="w-full text-sm border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Deskripsi gambar" value={alt} onChange={e => setAlt(e.target.value)} />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1">URL Gambar <span className="text-destructive">*</span></label>
              <input autoFocus
                className="w-full text-sm border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="https://..." value={url} onChange={e => setUrl(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && url) onInsert(url, alt); }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Alt text (opsional)</label>
              <input className="w-full text-sm border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Deskripsi gambar" value={alt} onChange={e => setAlt(e.target.value)} />
            </div>
          </div>
        )}

        <div className="flex gap-2 justify-end mt-4">
          <button type="button" onClick={onClose} className="text-sm px-3 py-1.5 rounded-md border hover:bg-muted transition-colors">
            Batal
          </button>
          <button
            type="button"
            disabled={tab === "upload" ? (!uploadedUrl || uploading) : !url}
            onClick={() => {
              if (tab === "upload" && uploadedUrl) onInsert(uploadedUrl, alt);
              else if (tab === "url" && url) onInsert(url, alt);
            }}
            className="text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sisipkan"}
          </button>
        </div>
      </div>
    </div>
  );
}

function LinkDialog({ onInsert, onClose }: { onInsert: (url: string) => void; onClose: () => void }) {
  const [url, setUrl] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">Sisipkan Tautan</h3>
          <button type="button" onClick={onClose} className="p-1 hover:bg-muted rounded">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">URL <span className="text-destructive">*</span></label>
          <input
            autoFocus
            className="w-full text-sm border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="https://..."
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && url) onInsert(url); }}
          />
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <button type="button" onClick={onClose} className="text-sm px-3 py-1.5 rounded-md border hover:bg-muted transition-colors">
            Batal
          </button>
          <button
            type="button"
            disabled={!url}
            onClick={() => url && onInsert(url)}
            className="text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            Sisipkan
          </button>
        </div>
      </div>
    </div>
  );
}

export function RichTextEditor({ value, onChange, placeholder, className }: Props) {
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder ?? "Tulis deskripsi..." }),
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary underline" } }),
    ],
    content: value ?? "",
    onUpdate({ editor }) {
      onChange?.(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[160px] px-3 py-3",
      },
    },
    immediatelyRender: false,
  });

  if (!editor) return null;

  const ToolBtn = ({
    active, onClick, children, title,
  }: { active?: boolean; onClick: () => void; children: React.ReactNode; title?: string }) => (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "p-1.5 rounded hover:bg-muted transition-colors",
        active ? "bg-muted text-foreground" : "text-muted-foreground"
      )}
    >
      {children}
    </button>
  );

  function insertImage(url: string, alt: string) {
    editor?.chain().focus().setImage({ src: url, alt }).run();
    setShowImageDialog(false);
  }

  function insertLink(url: string) {
    editor?.chain().focus().setLink({ href: url }).run();
    setShowLinkDialog(false);
  }

  return (
    <>
      <div className="rounded-md border border-input bg-background flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-input shrink-0">
          <ToolBtn title="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 as Level }).run()}>
            <Heading2 className="h-4 w-4" />
          </ToolBtn>
          <ToolBtn title="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 as Level }).run()}>
            <Heading3 className="h-4 w-4" />
          </ToolBtn>

          <div className="w-px h-5 bg-border mx-1" />

          <ToolBtn title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
            <Bold className="h-4 w-4" />
          </ToolBtn>
          <ToolBtn title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <Italic className="h-4 w-4" />
          </ToolBtn>
          <ToolBtn title="Tautan" active={editor.isActive("link")} onClick={() => setShowLinkDialog(true)}>
            <LinkIcon className="h-4 w-4" />
          </ToolBtn>

          <div className="w-px h-5 bg-border mx-1" />

          <ToolBtn title="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
            <List className="h-4 w-4" />
          </ToolBtn>
          <ToolBtn title="Ordered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            <ListOrdered className="h-4 w-4" />
          </ToolBtn>
          <ToolBtn title="Blockquote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
            <Quote className="h-4 w-4" />
          </ToolBtn>
          <ToolBtn title="Horizontal rule" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
            <Minus className="h-4 w-4" />
          </ToolBtn>

          <div className="w-px h-5 bg-border mx-1" />

          <ToolBtn title="Sisipkan gambar" onClick={() => setShowImageDialog(true)}>
            <ImageIcon className="h-4 w-4" />
          </ToolBtn>

          <div className="w-px h-5 bg-border mx-1" />

          <ToolBtn title="Undo" onClick={() => editor.chain().focus().undo().run()}>
            <Undo className="h-4 w-4" />
          </ToolBtn>
          <ToolBtn title="Redo" onClick={() => editor.chain().focus().redo().run()}>
            <Redo className="h-4 w-4" />
          </ToolBtn>
        </div>

        <div className={cn("overflow-y-auto flex-1", className)}>
          <EditorContent editor={editor} />
        </div>
      </div>

      {showImageDialog && (
        <ImageDialog onInsert={insertImage} onClose={() => setShowImageDialog(false)} />
      )}
      {showLinkDialog && (
        <LinkDialog onInsert={insertLink} onClose={() => setShowLinkDialog(false)} />
      )}
    </>
  );
}
