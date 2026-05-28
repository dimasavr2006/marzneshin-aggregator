import { ColumnDef } from "@tanstack/react-table"
import type { Pool } from "@marzneshin/modules/proxy-pool"
import {
    DataTableColumnHeader
} from "@marzneshin/libs/entity-table"
import i18n from "@marzneshin/features/i18n"
import { type ColumnActions } from "@marzneshin/libs/entity-table";
import { NoPropogationButton, Switch } from "@marzneshin/common/components"
import { Badge } from "@marzneshin/common/components/ui/badge";
import { RefreshCw, Loader2, SquareArrowOutUpRight, Pencil, Trash2 } from "lucide-react";
import { Button } from "@marzneshin/common/components";

const CategoryBadge = ({ category }: { category: string }) => {
    const variant = category === "bridge" ? "default" : "outline";
    return <Badge variant={variant}>{category}</Badge>;
};

const ActiveBadge = ({ isActive }: { isActive: boolean }) => {
    return (
        <Badge
            variant={isActive ? "default" : "outline"}
            className={isActive ? "" : "text-destructive border-destructive/40"}
        >
            {isActive ? i18n.t("active") : i18n.t("inactive")}
        </Badge>
    );
};

export const columns = (
    actions: ColumnActions<Pool>,
    onSync?: (entity: Pool) => void,
    syncingId?: number | null,
    onToggleActive?: (entity: Pool, isActive: boolean) => void,
    togglingId?: number | null,
): ColumnDef<Pool>[] => ([
    {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader title={i18n.t('name')} column={column} />,
        cell: ({ row }) => (
            <span className="flex items-center gap-1">
                {row.original.name}
                {row.original.preferred_bridge_server_id !== null && row.original.category === "bridge" && (
                    <span title={i18n.t('page.proxy-pools.preferred_server')}>⭐</span>
                )}
            </span>
        ),
    },
    {
        accessorKey: "category",
        header: ({ column }) => <DataTableColumnHeader title={i18n.t('category')} column={column} />,
        cell: ({ row }) => <CategoryBadge category={row.original.category} />,
    },
    {
        accessorKey: "type",
        header: ({ column }) => <DataTableColumnHeader title={i18n.t('type')} column={column} />,
    },
    {
        accessorKey: "routing_mode",
        header: ({ column }) => <DataTableColumnHeader title={i18n.t('page.proxy-pools.routing_mode')} column={column} />,
    },
    {
        accessorKey: "server_count",
        header: ({ column }) => <DataTableColumnHeader title={i18n.t('page.proxy-pools.servers.count')} column={column} />,
        cell: ({ row }) => (
            <Badge variant={row.original.server_count > 0 ? "default" : "destructive"}>
                {row.original.server_count} {i18n.t('page.proxy-pools.servers.count')}
            </Badge>
        ),
    },
    {
        accessorKey: "server_selection_mode",
        header: ({ column }) => (
            <DataTableColumnHeader
                title={i18n.t("page.proxy-pools.selection_mode")}
                column={column}
            />
        ),
        cell: ({ row }) => {
            if (row.original.category !== "external" || row.original.type !== "subscription") {
                return <span className="text-muted-foreground">-</span>;
            }
            return (
                <span className="text-sm capitalize">
                    {row.original.server_selection_mode || "all"}
                </span>
            );
        },
    },
    {
        accessorKey: "is_active",
        header: ({ column }) => <DataTableColumnHeader title={i18n.t('status')} column={column} />,
        cell: ({ row }) => (
            <div className="flex items-center gap-2">
                <Switch
                    checked={row.original.is_active}
                    disabled={togglingId === row.original.id}
                    onClick={(e) => e.stopPropagation()}
                    onCheckedChange={(checked) => onToggleActive?.(row.original, checked)}
                />
                {togglingId === row.original.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                ) : null}
                <ActiveBadge isActive={row.original.is_active} />
            </div>
        ),
    },
    {
        accessorKey: "last_sync_at",
        header: ({ column }) => <DataTableColumnHeader title={i18n.t('page.proxy-pools.last_sync')} column={column} />,
        cell: ({ row }) => row.original.last_sync_at ? new Date(row.original.last_sync_at).toLocaleString() : i18n.t('never'),
    },
    {
        id: "actions",
        cell: ({ row }) => {
            return (
                <NoPropogationButton row={row} actions={actions}>
                    <div className="flex items-center gap-1">
                        {onSync && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSync(row.original);
                                }}
                                disabled={syncingId === row.original.id}
                            >
                                {syncingId === row.original.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="h-4 w-4" />
                                )}
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                                e.stopPropagation();
                                actions.onOpen(row.original);
                            }}
                            title={i18n.t("open")}
                        >
                            <SquareArrowOutUpRight className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                                e.stopPropagation();
                                actions.onEdit(row.original);
                            }}
                            title={i18n.t("edit")}
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={(e) => {
                                e.stopPropagation();
                                actions.onDelete(row.original);
                            }}
                            title={i18n.t("delete")}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </NoPropogationButton>
            );
        },
    }
]);
