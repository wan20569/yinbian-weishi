"use client";

import { EmptyState } from "@/components/workbench/empty-state";
import { TaskCard } from "@/components/workbench/task-card";
import type { Task } from "@/lib/types";

export interface TaskListProps {
  tasks: Task[];
  selectedId?: string | null;
  onSelect: (task: Task) => void;
  searchTerm?: string;
}

export function TaskList({ tasks, selectedId, onSelect, searchTerm }: TaskListProps) {
  if (tasks.length === 0) {
    return <EmptyState variant={searchTerm ? "search" : "no-task"} />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {tasks.map((task, index) => (
        <div
          key={task.id}
          className="animate-fade-up relative hover:z-10"
          style={{ animationDelay: `${index * 40}ms` }}
        >
          <TaskCard task={task} selected={task.id === selectedId} onSelect={onSelect} />
        </div>
      ))}
    </div>
  );
}
