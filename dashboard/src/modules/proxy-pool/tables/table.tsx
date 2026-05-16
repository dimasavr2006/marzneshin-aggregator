import { FC, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { EntityTable } from "@marzneshin/libs/entity-table";
import { fetchPools, Pool, usePoolsSyncMutation } from "@marzneshin/modules/proxy-pool";
import { Tabs, TabsList, TabsTrigger } from "@marzneshin/common/components";
import { useTranslation } from "react-i18next";
import { columns } from "./columns";

type CategoryFilter = "all" | "bridge" | "external";

export const PoolsTable: FC = () => {
    const navigate = useNavigate({ from: "/proxy-pools" });
    const { t } = useTranslation();
    const [category, setCategory] = useState<CategoryFilter>("all");
    const [syncingId, setSyncingId] = useState<number | null>(null);
    const syncMutation = usePoolsSyncMutation();

    const entityKey = category === "all" ? "proxy-pools" : `proxy-pools-${category}`;

    const onOpen = (entity: Pool) => navigate({ 
        to: "/proxy-pools/$poolId", 
        params: { poolId: String(entity.id) } 
    });
    
    const onEdit = (entity: Pool) => navigate({ 
        to: "/proxy-pools/$poolId/edit", 
        params: { poolId: String(entity.id) } 
    });
    
    const onDelete = (entity: Pool) => navigate({ 
        to: "/proxy-pools/$poolId/delete", 
        params: { poolId: String(entity.id) } 
    });

    const onSync = (entity: Pool) => {
        setSyncingId(entity.id);
        syncMutation.mutate(entity.id, {
            onSettled: () => setSyncingId(null),
        });
    };

    const columnsDef = columns({ onEdit, onDelete, onOpen }, onSync, syncingId);

    return (
        <div className="flex flex-col gap-4 w-full">
            <Tabs value={category} onValueChange={(v) => setCategory(v as CategoryFilter)}>
                <TabsList>
                    <TabsTrigger value="all">{t("all")}</TabsTrigger>
                    <TabsTrigger value="bridge">{t("category.bridge")}</TabsTrigger>
                    <TabsTrigger value="external">{t("category.external")}</TabsTrigger>
                </TabsList>
            </Tabs>
            <EntityTable
                fetchEntity={fetchPools}
                columns={columnsDef}
                primaryFilter="name"
                entityKey={entityKey}
                onCreate={() => navigate({ to: "/proxy-pools/create" })}
                onOpen={onOpen}
            />
        </div>
    );
};
