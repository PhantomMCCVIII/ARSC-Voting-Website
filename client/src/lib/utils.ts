import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function convertGoogleDriveLink(url: string): string {
  // Check if it's a Google Drive link
  const driveMatch = url.match(/\/d\/(.+?)\//)
  if (driveMatch) {
    // Extract the file ID and convert to direct link
    const fileId = driveMatch[1]
    return `https://drive.google.com/uc?export=view&id=${fileId}`
  }
  return url
}