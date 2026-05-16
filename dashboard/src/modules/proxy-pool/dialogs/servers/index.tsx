import { type FC, useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    Button,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    Badge,
} from "@marzneshin/common/components";
import { useTranslation } from "react-i18next";
import { usePoolsSyncMutation, usePoolsUpdateMutation, usePoolServerUpdateMutation, type Pool, type PoolServer } from "@marzneshin/modules/proxy-pool";
import { Loader2, RefreshCw, Star, Pencil, X, Check } from "lucide-react";
import { Input } from "@marzneshin/common/components";

interface ServersDialogProps {
    open: boolean;
    onOpenChange: (state: boolean) => void;
    pool: Pool;
}

const StatusBadge = ({ isAvailable }: { isAvailable: boolean }) => {
    return <Badge variant={isAvailable ? "default" : "destructive"}>{isAvailable ? "Online" : "Offline"}</Badge>;
};

export const ServersDialog: FC<ServersDialogProps> = ({
    open,
    onOpenChange,
    pool,
}) => {
    const { t } = useTranslation();
    const syncMutation = usePoolsSyncMutation();
    const updateMutation = usePoolsUpdateMutation();
    const [servers, setServers] = useState<PoolServer[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [settingPreferredId, setSettingPreferredId] = useState<number | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState("");
    const [editNaming, setEditNaming] = useState("");
    const serverUpdateMutation = usePoolServerUpdateMutation();

    const fetchServers = async () => {
        if (!pool?.id) return;
        setIsLoading(true);
        try {
            const { fetchPoolServers } = await import("@marzneshin/modules/proxy-pool");
            const data = await fetchPoolServers(pool.id);
            setServers(data);
        } catch (error) {
            console.error("Failed to fetch servers:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (open) {
            fetchServers();
        }
    }, [open, pool?.id]);

    const handleSync = () => {
        syncMutation.mutate(pool.id, {
            onSuccess: () => {
                fetchServers();
            }
        });
    };

    const handleSetPreferred = (serverId: number) => {
        setSettingPreferredId(serverId);
        updateMutation.mutate(
            { ...pool, preferred_bridge_server_id: serverId },
            {
                onSettled: () => setSettingPreferredId(null),
            }
        );
    };

    const handleEditStart = (server: PoolServer) => {
        setEditingId(server.id);
        setEditName(server.name || "");
        setEditNaming(server.bridge_naming_override || "");
    };

    const handleEditSave = (serverId: number) => {
        serverUpdateMutation.mutate(
            {
                serverId,
                data: {
                    name: editName || null,
                    bridge_naming_override: editNaming || null,
                },
            },
            {
                onSuccess: () => {
                    setEditingId(null);
                    fetchServers();
                },
            }
        );
    };

    const handleEditCancel = () => {
        setEditingId(null);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="text-primary">
                        {pool?.name} - {t("page.proxy-pools.dialogs.servers.title")}
                    </DialogTitle>
                </DialogHeader>
                
                <div className="flex justify-between items-center mb-4">
                    <span className="text-sm text-muted-foreground">
                        {servers.length} {t("page.proxy-pools.servers.count")}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSync}
                        disabled={syncMutation.isPending}
                    >
                        {syncMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        {t("page.proxy-pools.sync.action")}
                    </Button>
                </div>

                <div className="max-h-[400px] overflow-y-auto">
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-16">ID</TableHead>
                                    <TableHead>{t("name")}</TableHead>
                                    <TableHead>{t("address")}</TableHead>
                                    <TableHead>{t("type")}</TableHead>
                                    <TableHead>{t("page.proxy-pools.latency")}</TableHead>
                                    <TableHead>{t("status")}</TableHead>
                                    <TableHead>{t("actions")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {servers.map((server) => (
                                    <TableRow
                                        key={server.id}
                                        className={
                                            pool.preferred_bridge_server_id === server.id
                                                ? "bg-primary/10"
                                                : undefined
                                        }
                                    >
                                        <TableCell className="font-mono text-xs">{server.id}</TableCell>
                                        <TableCell>
                                            {editingId === server.id ? (
                                                <div className="flex flex-col gap-1">
                                                    <Input
                                                        value={editName}
                                                        onChange={(e) => setEditName(e.target.value)}
                                                        placeholder={t("name")}
                                                        className="h-7 text-sm"
                                                    />
                                                    <Input
                                                        value={editNaming}
                                                        onChange={(e) => setEditNaming(e.target.value)}
                                                        placeholder={t("page.proxy-pools.bridge_naming_template")}
                                                        className="h-7 text-sm"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="flex flex-col">
                                                    <span>{server.name || "-"}</span>
                                                    {server.bridge_naming_override && (
                                                        <span className="text-xs text-muted-foreground">
                                                            {server.bridge_naming_override}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>{server.address}:{server.port}</TableCell>
                                        <TableCell className="capitalize">{server.protocol}</TableCell>
                                        <TableCell>
                                            {server.latency_ms !== null ? `${server.latency_ms}ms` : "-"}
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge isAvailable={server.is_available} />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                {editingId === server.id ? (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7"
                                                            onClick={() => handleEditSave(server.id)}
                                                            disabled={serverUpdateMutation.isPending}
                                                        >
                                                            <Check className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7"
                                                            onClick={handleEditCancel}
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7"
                                                            onClick={() => handleEditStart(server)}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        {pool.category === "bridge" && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleSetPreferred(server.id)}
                                                                disabled={settingPreferredId === server.id}
                                                            >
                                                                {settingPreferredId === server.id ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                                                ) : (
                                                                    <Star className="h-4 w-4 mr-1" />
                                                                )}
                                                                {pool.preferred_bridge_server_id === server.id
                                                                    ? t("page.proxy-pools.preferred_server")
                                                                    : t("page.proxy-pools.set_preferred")
                                                                }
                                                            </Button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
