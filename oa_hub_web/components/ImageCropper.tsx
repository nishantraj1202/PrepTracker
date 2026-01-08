"use client";

import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Point, Area } from "react-easy-crop";

interface ImageCropperProps {
    imageSrc: string;
    onCancel: () => void;
    onSave: (croppedImageBase64: string) => void;
}

export default function ImageCropper({ imageSrc, onCancel, onSave }: ImageCropperProps) {
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

    const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleSave = async () => {
        if (!croppedAreaPixels) return;
        try {
            const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
            if (croppedImage) {
                onSave(croppedImage);
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4">
            <div className="relative w-full max-w-4xl h-[60vh] bg-dark-900 rounded-lg overflow-hidden border border-dark-700">
                <Cropper
                    image={imageSrc}
                    crop={crop}
                    zoom={zoom}
                    aspect={undefined} // Free aspect ratio
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                    style={{
                        containerStyle: { background: "#1a1a1a" },
                        cropAreaStyle: { border: "2px solid #EAB308" } // Brand color
                    }}
                />
            </div>

            <div className="mt-6 w-full max-w-md space-y-4 bg-dark-800 p-4 rounded-lg border border-dark-700">
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-400 font-medium">Zoom</span>
                    <input
                        type="range"
                        value={zoom}
                        min={1}
                        max={3}
                        step={0.1}
                        aria-labelledby="Zoom"
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="w-full accent-brand h-1 bg-dark-600 rounded-lg appearance-none cursor-pointer"
                    />
                </div>

                <div className="flex gap-3 justify-end pt-2">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 rounded bg-dark-700 hover:bg-dark-600 text-gray-300 transition-colors font-medium text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 rounded bg-brand hover:bg-yellow-500 text-black font-bold transition-colors text-sm"
                    >
                        Save Crop
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- Utility: Canvas Crop ---
async function getCroppedImg(
    imageSrc: string,
    pixelCrop: Area,
    rotation = 0
): Promise<string | null> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
        return null;
    }

    const rotRad = getRadianAngle(rotation);

    // Calculate bounding box of the rotated image
    const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
        image.width,
        image.height,
        rotation
    );

    // Set canvas size to match the bounding box
    canvas.width = bBoxWidth;
    canvas.height = bBoxHeight;

    // Translate canvas context to a central location to allow rotating and flipping around the center
    ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
    ctx.rotate(rotRad);
    ctx.translate(-image.width / 2, -image.height / 2);

    // Draw the source image into the canvas
    ctx.drawImage(image, 0, 0);

    // Get the data from the canvas for the specific cropped area
    const data = ctx.getImageData(
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height
    );

    // Set canvas width to final desired crop size - this will clear existing context
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    // Paste generated rotate image into the top left corner
    ctx.putImageData(data, 0, 0);

    // As Base64 string
    return new Promise((resolve) => {
        resolve(canvas.toDataURL("image/jpeg"));
    });
}

function createImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener("load", () => resolve(image));
        image.addEventListener("error", (error) => reject(error));
        image.setAttribute("crossOrigin", "anonymous"); // Needed to avoid CORS issues on CodeSandbox
        image.src = url;
    });
}

function getRadianAngle(degreeValue: number) {
    return (degreeValue * Math.PI) / 180;
}

/**
 * Returns the new bounding area of a rotated rectangle.
 */
function rotateSize(width: number, height: number, rotation: number) {
    const rotRad = getRadianAngle(rotation);

    return {
        width:
            Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
        height:
            Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
    };
}
