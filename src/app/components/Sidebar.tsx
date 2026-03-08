import { File, Folder, ChevronRight, ChevronDown, Download, Plus, FolderPlus, Trash2, MoreVertical } from "lucide-react";
import { motion } from "motion/react";
import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { FileItem } from "../types/ide";

interface SidebarProps {
  currentFile: string;
  onFileSelect: (filePath: string) => void;
  onSaveFile: (filePath: string) => void;
  onCreateFile: (parentPath: string, fileName: string) => void;
  onCreateFolder: (parentPath: string, folderName: string) => void;
  onDeleteFile: (filePath: string) => void;
  onDownloadFile: (filePath: string) => void;
  fileTree: FileItem[];
  isVisible: boolean;
}
const sortFileItems = (items: FileItem[]) => {
  return [...items].sort((a, b) => {
    // Folders come before files
    if (a.type === "folder" && b.type !== "folder") return -1;
    if (a.type !== "folder" && b.type === "folder") return 1;

    // Alphabetical sorting within the same type
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
};

function FileTreeItem({
  item,
  currentFile,
  onFileSelect,
  onSaveFile,
  onDeleteFile,
  onDownloadFile,
  onCreateFile,
  onCreateFolder,
  onDeleteFolder,
  depth = 0,
}: {
  item: FileItem;
  currentFile: string;
  onFileSelect: (filePath: string) => void;
  onSaveFile: (filePath: string) => void;
  onDeleteFile: (filePath: string) => void;
  onDownloadFile: (filePath: string) => void;
  onCreateFile: (parentPath: string, fileName: string) => void;
  onCreateFolder: (parentPath: string, folderName: string) => void;
  onDeleteFolder: (folderPath: string) => void;
  depth?: number;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [showCreateFileDialog, setShowCreateFileDialog] = useState(false);
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const isActive = item.type === "file" && currentFile === item.path;

  const handleCreateFile = () => {
    if (newFileName) {
      onCreateFile(item.path, newFileName);
      setNewFileName("");
      setShowCreateFileDialog(false);
    }
  };

  const handleCreateFolder = () => {
    if (newFolderName) {
      onCreateFolder(item.path, newFolderName);
      setNewFolderName("");
      setShowCreateFolderDialog(false);
    }
  };

  if (item.type === "folder") {
    return (
      <>
        <div>
          <div className="flex items-center gap-1 group">
            <div style={{ paddingLeft: `${depth * 12 + 12}px` }} className="flex-1 flex">
              <motion.button
                whileHover={{ x: 2 }}
                onClick={() => setIsOpen(!isOpen)}
                className="flex-1 flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/5 dark:hover:bg-white/5 rounded-lg transition-colors"

              >
                {isOpen ? (
                  <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                )}
                <Folder className="w-4 h-4 text-purple-500" />
                <span className="text-gray-700 dark:text-gray-300 whitespace-nowrap">{item.name}</span>
              </motion.button>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowCreateFileDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  New File
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowCreateFolderDialog(true)}>
                  <FolderPlus className="w-4 h-4 mr-2" />
                  New Folder
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    if (confirm(`Delete folder "${item.name}" and all its contents?`)) {
                      onDeleteFolder(item.path);
                    }
                  }}
                  className="text-red-600 dark:text-red-400"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Folder
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {isOpen && item.children && (
            <div>
              {sortFileItems(item.children.filter(child => !child.name.startsWith('.')))
                .map((child) => (
                  <FileTreeItem
                    key={child.path}
                    item={child}
                    currentFile={currentFile}
                    onFileSelect={onFileSelect}
                    onSaveFile={onSaveFile}
                    onDeleteFile={onDeleteFile}
                    onDownloadFile={onDownloadFile}
                    onCreateFile={onCreateFile}
                    onCreateFolder={onCreateFolder}
                    onDeleteFolder={onDeleteFolder}
                    depth={depth + 1}
                  />
                ))}
            </div>
          )}
        </div>

        {/* New File Dialog for this folder */}
        <Dialog open={showCreateFileDialog} onOpenChange={setShowCreateFileDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New File in {item.name}</DialogTitle>
              <DialogDescription>
                Enter a name for your new C file
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor={`filename-${item.path}`}>File Name</Label>
                <Input
                  id={`filename-${item.path}`}
                  placeholder="program.c"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateFile();
                  }}
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateFileDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateFile} disabled={!newFileName}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* New Folder Dialog for this folder */}
        <Dialog open={showCreateFolderDialog} onOpenChange={setShowCreateFolderDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Folder in {item.name}</DialogTitle>
              <DialogDescription>
                Enter a name for your new folder
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor={`foldername-${item.path}`}>Folder Name</Label>
                <Input
                  id={`foldername-${item.path}`}
                  placeholder="my-folder"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateFolder();
                  }}
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateFolderDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateFolder} disabled={!newFolderName}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className="flex items-center gap-1 group">
      <div style={{ paddingLeft: `${depth * 12 + 12}px` }} className="flex-1 flex">
        <motion.button
          whileHover={{ x: 2 }}
          onClick={() => onFileSelect(item.path)}
          className={`flex-1 flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all ${isActive
            ? "bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-indigo-500/10 border border-purple-500/30 shadow-lg shadow-purple-500/10"
            : "hover:bg-white/5 dark:hover:bg-white/5"
            }`}

        >
          <div className="w-4" />
          <File className={`w-4 h-4 ${isActive ? "text-purple-500" : "text-gray-500 dark:text-gray-400"}`} />
          <span className={`${isActive ? "text-purple-600 dark:text-purple-400 font-medium" : "text-gray-700 dark:text-gray-300"} whitespace-nowrap`}>
            {item.name}
          </span>
        </motion.button>
      </div>

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity sticky right-0 bg-white/5 dark:bg-[#111122]/60 backdrop-blur-sm rounded-lg">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDownloadFile(item.path)}
          className="h-7 w-7 p-0 hover:bg-blue-500/20"
          title="Download file"
        >
          <Download className="w-3 h-3 text-blue-600 dark:text-blue-400" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (confirm(`Delete ${item.path}?`)) {
              onDeleteFile(item.path);
            }
          }}
          className="h-7 w-7 p-0 hover:bg-red-500/20"
          title="Delete file"
        >
          <Trash2 className="w-3 h-3 text-red-600 dark:text-red-400" />
        </Button>
      </div>
    </div>
  );
}

export function Sidebar({
  currentFile,
  onFileSelect,
  onSaveFile,
  onCreateFile,
  onCreateFolder,
  onDeleteFile,
  onDownloadFile,
  fileTree,
  isVisible
}: SidebarProps) {
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedParentPath, setSelectedParentPath] = useState("");
  const [contentScrollWidth, setContentScrollWidth] = useState(0);

  // Refs for the sticky horizontal scrollbar sync
  const vScrollRef = useRef<HTMLDivElement>(null);
  const hScrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);

  useEffect(() => {
    if (!contentRef.current) return;
    const ro = new ResizeObserver(() => {
      setContentScrollWidth(contentRef.current?.scrollWidth ?? 0);
    });
    ro.observe(contentRef.current);
    return () => ro.disconnect();
  }, []);

  const onVScroll = () => {
    if (isSyncing.current) return;
    isSyncing.current = true;
    if (hScrollRef.current && vScrollRef.current)
      hScrollRef.current.scrollLeft = vScrollRef.current.scrollLeft;
    isSyncing.current = false;
  };

  const onHScroll = () => {
    if (isSyncing.current) return;
    isSyncing.current = true;
    if (vScrollRef.current && hScrollRef.current)
      vScrollRef.current.scrollLeft = hScrollRef.current.scrollLeft;
    isSyncing.current = false;
  };

  if (!isVisible) return null;

  // Get all folders for the dropdown
  const getAllFolders = (items: FileItem[], prefix = ""): { path: string; label: string }[] => {
    const folders: { path: string; label: string }[] = [{ path: "", label: "Root" }];

    const traverse = (items: FileItem[], prefix: string) => {
      items.forEach(item => {
        if (item.type === "folder") {
          folders.push({
            path: item.path,
            label: prefix + item.name
          });
          if (item.children) {
            traverse(item.children, prefix + item.name + "/");
          }
        }
      });
    };

    traverse(items, "");
    return folders;
  };

  const folders = getAllFolders(fileTree);

  const handleCreateFile = () => {
    if (newFileName) {
      onCreateFile(selectedParentPath, newFileName);
      setNewFileName("");
      setSelectedParentPath("");
      setShowNewFileDialog(false);
    }
  };

  const handleCreateFolder = () => {
    if (newFolderName) {
      onCreateFolder(selectedParentPath, newFolderName);
      setNewFolderName("");
      setSelectedParentPath("");
      setShowNewFolderDialog(false);
    }
  };

  const handleDeleteFolder = (folderPath: string) => {
    onDeleteFile(folderPath);
  };

  return (
    <>
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className={`transition-all duration-300 ease-in-out border-r border-black/5 dark:border-white/10 bg-white/40 dark:bg-[#111122]/40 backdrop-blur-2xl p-4 flex flex-col shadow-2xl ${isVisible ? "w-64 opacity-100" : "w-0 p-0 border-none opacity-0 overflow-hidden"}`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-3">
            File Explorer
          </h2>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedParentPath("");
                setShowNewFileDialog(true);
              }}
              className="h-7 w-7 p-0 hover:bg-purple-500/20"
              title="New File"
            >
              <Plus className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedParentPath("");
                setShowNewFolderDialog(true);
              }}
              className="h-7 w-7 p-0 hover:bg-purple-500/20"
              title="New Folder"
            >
              <FolderPlus className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </Button>
          </div>
        </div>
        {/* Flex column: content scrolls vertically, scrollbar is always pinned at bottom */}
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Vertical scroll area — hides native h-scrollbar */}
          <div
            ref={vScrollRef}
            onScroll={onVScroll}
            className="flex-1 min-h-0 overflow-y-auto overflow-x-auto hide-scrollbar"
          >
            <div ref={contentRef} className="space-y-1 min-w-max pr-4">
              {sortFileItems(fileTree).map((item) => (
                <FileTreeItem
                  key={item.path}
                  item={item}
                  currentFile={currentFile}
                  onFileSelect={onFileSelect}
                  onSaveFile={onSaveFile}
                  onDeleteFile={onDeleteFile}
                  onDownloadFile={onDownloadFile}
                  onCreateFile={onCreateFile}
                  onCreateFolder={onCreateFolder}
                  onDeleteFolder={handleDeleteFolder}
                />
              ))}
            </div>
          </div>
          {/* Sticky horizontal scrollbar — always visible at bottom, synced with content */}
          <div
            ref={hScrollRef}
            onScroll={onHScroll}
            className="flex-shrink-0 overflow-x-auto custom-horizontal-scroll"
          >
            <div style={{ width: contentScrollWidth, height: 1 }} />
          </div>
        </div>
      </motion.aside>

      {/* New File Dialog */}
      <Dialog open={showNewFileDialog} onOpenChange={setShowNewFileDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New File</DialogTitle>
            <DialogDescription>
              Enter a name for your new C file and select the parent folder
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="parent-folder">Parent Folder</Label>
              <select
                id="parent-folder"
                value={selectedParentPath}
                onChange={(e) => setSelectedParentPath(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {folders.map(folder => (
                  <option key={folder.path} value={folder.path}>
                    {folder.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="filename">File Name</Label>
              <Input
                id="filename"
                placeholder="program.c"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateFile();
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFileDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFile} disabled={!newFileName}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Folder Dialog */}
      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Enter a name for your new folder and select the parent folder
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="parent-folder-new">Parent Folder</Label>
              <select
                id="parent-folder-new"
                value={selectedParentPath}
                onChange={(e) => setSelectedParentPath(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {folders.map(folder => (
                  <option key={folder.path} value={folder.path}>
                    {folder.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="foldername">Folder Name</Label>
              <Input
                id="foldername"
                placeholder="my-folder"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateFolder();
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFolderDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}