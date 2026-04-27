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

const CategoryBadge = ({ category }: { category: string }) => {
    const variant = category === "bridge" ? "default" : "secondary";
    return <Badge variant={variant}>{category}</Badge>;
};

const ActiveBadge = ({ isActive }: { isActive: boolean }) => {
    return <Badge variant={isActive ? "default" : "destructive"}>{isActive ? i18n.t('active') : i18n.t('inactive')}</Badge>;
};

export const columns = (actions: ColumnActions<Pool>): ColumnDef<Pool>[] => ([
    {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader title={i18n.t('name')} column={column} />,
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
