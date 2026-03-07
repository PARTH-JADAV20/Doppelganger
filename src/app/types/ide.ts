export interface FileItem {
  name: string;
  type: "file" | "folder";
  path: string;
  children?: FileItem[];
}
