import { FC } from "react";
import { useNavigate } from "@tanstack/react-router";
import { EntityTable } from "@marzneshin/libs/entity-table";
import { fetchPools, Pool } from "@marzneshin/modules/proxy-pool";
import { columns } from "./columns";

export const PoolsTable: FC = () => {
    const navigate = useNavigate({ from: "/proxy-pools" });

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

    const columnsDef = columns({ onEdit, onDelete, onOpen });

    return (
        <EntityTable
            fetchEntity={fetchPools}
            columns={columnsDef}
            primaryFilter="name"
            entityKey="proxy-pools"
            onCreate={() => navigate({ to: "/proxy-pools/create" })}
            onOpen={onOpen}
        />
    );
};
