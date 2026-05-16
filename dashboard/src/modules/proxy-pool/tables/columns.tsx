import { ColumnDef } from "@tanstack/react-table"
import type { Pool } from "@marzneshin/modules/proxy-pool"
import {
    DataTableActionsCell,
    DataTableColumnHeader
} from "@marzneshin/libs/entity-table"
import i18n from "@marzneshin/features/i18n"
import { type ColumnActions } from "@marzneshin/libs/entity-table";
import { NoPropogationButton } from "@marzneshin/common/components"
import { Badge } from "@marzneshin/common/components/ui/badge";
import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@marzneshin/common/components";

const CategoryBadge = ({ category }: { category: string }) => {
    const variant = category === "bridge" ? "default" : "secondary";
    return <Badge variant={variant}>{category}</Badge>;
};

const ActiveBadge = ({ isActive }: { isActive: boolean }) => {
    return <Badge variant={isActive ? "default" : "destructive"}>{isActive ? i18n.t('active') : i18n.t('inactive')}</Badge>;
};

export const columns = (actions: ColumnActions<Pool>, onSync?: (entity: Pool) => void, syncingId?: number | null): ColumnDef<Pool>[] => ([
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
        accessorKey: "is_active",
        header: ({ column }) => <DataTableColumnHeader title={i18n.t('status')} column={column} />,
        cell: ({ row }) => <ActiveBadge isActive={row.original.is_active} />,
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
                        <DataTableActionsCell {...actions} row={row} />
                    </div>
                </NoPropogationButton>
            );
        },
    }
]);
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
        accessorKey: "is_active",
        header: ({ column }) => <DataTableColumnHeader title={i18n.t('status')} column={column} />,
        cell: ({ row }) => <ActiveBadge isActive={row.original.is_active} />,
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
                    <DataTableActionsCell {...actions} row={row} />
                </NoPropogationButton>
            );
        },
    }
]);
