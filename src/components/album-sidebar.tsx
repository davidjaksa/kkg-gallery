import Link from "next/link";
import { Icon } from "@/components/icon";
import type { SidebarNode } from "@/lib/queries";

function NodeLinks({
  nodes,
  activeId,
  depth = 0,
}: {
  nodes: SidebarNode[];
  activeId: string;
  depth?: number;
}) {
  return (
    <>
      {nodes.map((node) => {
        const active = node.id === activeId;
        return (
          <div key={node.id}>
            <Link
              href={node.href}
              className={
                active
                  ? "py-2 px-4 border-l-2 border-primary text-primary font-medium flex items-center justify-between bg-surface-container-low rounded-r min-h-11"
                  : "py-2 px-4 border-l-2 border-surface-container text-secondary hover:text-primary transition-colors flex items-center justify-between group min-h-11"
              }
              style={{ marginLeft: depth * 12 }}
            >
              <span className="truncate">{node.title}</span>
              <Icon
                name="chevron_right"
                className={`text-xs shrink-0 ${active ? "" : "opacity-0 group-hover:opacity-100"}`}
              />
            </Link>
            {node.children.length > 0 ? (
              <NodeLinks nodes={node.children} activeId={activeId} depth={depth + 1} />
            ) : null}
          </div>
        );
      })}
    </>
  );
}

export function AlbumSidebar({ nodes, activeId }: { nodes: SidebarNode[]; activeId: string }) {
  return (
    <aside className="hidden xl:block w-64 flex-shrink-0">
      <div className="bg-surface-container-lowest rounded-xl border border-surface-container p-6 shadow-sm sticky top-24">
        <nav className="flex flex-col gap-1">
          <NodeLinks nodes={nodes} activeId={activeId} />
        </nav>
      </div>
    </aside>
  );
}

export function AlbumNavMobile({ nodes, activeId }: { nodes: SidebarNode[]; activeId: string }) {
  return (
    <details className="xl:hidden mb-stack-lg bg-surface-container-lowest rounded-xl border border-surface-container p-4 shadow-sm">
      <summary className="font-headline-md text-on-surface cursor-pointer min-h-11 flex items-center justify-between gap-2 list-none [&::-webkit-details-marker]:hidden">
        <span className="flex items-center">
          <Icon name="photo_album" className="text-sm mr-2" />
          Albumok
        </span>
        <Icon name="expand_more" className="text-sm" />
      </summary>
      <nav className="flex flex-col gap-1 mt-4">
        <NodeLinks nodes={nodes} activeId={activeId} />
      </nav>
    </details>
  );
}
