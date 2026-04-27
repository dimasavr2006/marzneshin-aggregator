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
import { usePoolsSyncMutation, type Pool, type PoolServer } from "@marzneshin/modules/proxy-pool";
import { Loader2, RefreshCw } from "lucide-react";

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
    const [servers, setServers] = useState<PoolServer[]>([]);
    const [isLoading, setIsLoading] = useState(false);

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
                                    <TableHead>{t("name")}</TableHead>
                                    <TableHead>{t("address")}</TableHead>
                                    <TableHead>{t("type")}</TableHead>
                                    <TableHead>{t("page.proxy-pools.latency")}</TableHead>
                                    <TableHead>{t("status")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {servers.map((server) => (
                                    <TableRow key={server.id}>
                                        <TableCell>{server.name || "-"}</TableCell>
                                        <TableCell>{server.address}:{server.port}</TableCell>
                                        <TableCell className="capitalize">{server.protocol}</TableCell>
                                        <TableCell>
                                            {server.latency_ms !== null ? `${server.latency_ms}ms` : "-"}
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge isAvailable={server.is_available} />
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
