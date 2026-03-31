"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, X, ImageIcon, Loader2 } from "lucide-react";

interface Props {
  value?: string;
  onChange: (url: string) => void;
  folder?: string;
}

export default function ImageUpload({ value, onChange, folder = "general" }: Props) {
  const [uploading, setUploading] = useState(false);
  const supabase = createClient();

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      const { data, error } = await supabase.storage
        .from("images")
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from("images")
        .getPublicUrl(filePath);

      onChange(publicUrl);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Lỗi khi tải ảnh lên!");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {value ? (
        <div className="relative aspect-video rounded-lg overflow-hidden border bg-muted">
          <img src={value} alt="Uploaded" className="w-full h-full object-cover" />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 size-8 rounded-full shadow-lg"
            onClick={() => onChange("")}
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <div className="relative aspect-video rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 text-muted-foreground bg-muted/20 hover:bg-muted/40 transition-colors">
          {uploading ? (
            <>
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Đang tải lên...</p>
            </>
          ) : (
            <>
              <div className="p-3 rounded-full bg-primary/10 text-primary">
                <Upload className="size-6" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-foreground">Click để tải ảnh lên</p>
                <p className="text-xs">PNG, JPG tối đa 5MB</p>
              </div>
              <input
                type="file"
                accept="image/*"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleUpload}
                disabled={uploading}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
