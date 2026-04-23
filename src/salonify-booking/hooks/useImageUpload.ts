import { useState } from "react";
import { toast } from "sonner";

export function useImageUpload() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImagePreview(null);
    setImageData(null);

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Afbeelding is te groot. Maximale grootte is 5MB.");
      return;
    }

    setImageUploading(true);

    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      const processImage = () => {
        return new Promise<string>((resolve, reject) => {
          img.onload = () => {
            let width = img.width;
            let height = img.height;
            const maxDimension = 1200;

            if (width > maxDimension || height > maxDimension) {
              if (width > height) {
                height = Math.round(height * (maxDimension / width));
                width = maxDimension;
              } else {
                width = Math.round(width * (maxDimension / height));
                height = maxDimension;
              }
            }

            canvas.width = width;
            canvas.height = height;

            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              const base64Data = canvas.toDataURL("image/jpeg", 0.7);
              resolve(base64Data);
            } else {
              reject(new Error("Failed to get canvas context"));
            }
          };

          img.onerror = () => reject(new Error("Failed to load image"));
        });
      };

      const reader = new FileReader();
      reader.onload = async (readerEvent) => {
        img.src = readerEvent.target?.result as string;

        try {
          const base64Data = await processImage();
          setImagePreview(base64Data);
          setImageData(base64Data);
        } catch (processingError) {
          console.error("Processing error:", processingError);
          toast.error(
            "Er is een fout opgetreden bij het verwerken van de afbeelding."
          );
          setImagePreview(null);
          setImageData(null);
        }
      };

      reader.onerror = () => {
        toast.error("Er is een fout opgetreden bij het laden van de afbeelding.");
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Image processing error:", error);
      toast.error("Er is een fout opgetreden bij het verwerken van de afbeelding.");
    } finally {
      setImageUploading(false);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    setImageData(null);
  };

  return {
    imagePreview,
    imageData,
    imageUploading,
    handleImageUpload,
    removeImage,
  };
}

