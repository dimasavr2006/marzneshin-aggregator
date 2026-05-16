import { type FC, useMemo, useState, useEffect } from "react";
import {
    DialogTitle,
    DialogContent,
    Dialog,
    DialogHeader,
    Form,
    FormItem,
    FormControl,
    FormMessage,
    FormLabel,
    Input,
    FormField,
    Button,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Switch,
    HStack,
} from "@marzneshin/common/components";
import { useTranslation } from "react-i18next";
import {
    PoolMutationSchema,
    usePoolsCreationMutation,
    usePoolsUpdateMutation,
} from "../..";
import type { Pool } from "../..";
import { useMutationDialog, MutationDialogProps } from "@marzneshin/common/hooks";

export const MutationDialog: FC<MutationDialogProps<Pool>> = ({
    entity,
    onClose,
}) => {
    const updateMutation = usePoolsUpdateMutation();
    const createMutation = usePoolsCreationMutation();
    const { t } = useTranslation();
    const [servers, setServers] = useState<Array<{ id: number; name: string | null; address: string | null; port: number | null }>>([]);
    const [serversLoading, setServersLoading] = useState(false);
    const [bridgeSubs, setBridgeSubs] = useState<Pool[]>([]);

    const defaultValue = useMemo(() => ({
        name: "",
        url: "",
        type: "vless" as const,
        category: "bridge" as const,
        routing_mode: "both" as const,
        bridge_naming_template: null as string | null,
        preferred_bridge_server_id: null as number | null,
        bridge_subscription_id: null as number | null,
        is_active: true,
    }), []);

    const { onOpenChange, open, form, handleSubmit } = useMutationDialog({
        entity,
        onClose,
        schema: PoolMutationSchema,
        createMutation,
        updateMutation,
        defaultValue,
    });

    const category = form.watch("category");
    const routingMode = form.watch("routing_mode");

    useEffect(() => {
        if (entity?.id && category === "bridge") {
            setServersLoading(true);
            import("@marzneshin/modules/proxy-pool")
                .then(({ fetchPoolServers }) => fetchPoolServers(entity.id))
                .then((data: Array<{ id: number; name: string | null; address: string | null; port: number | null }>) => setServers(data))
                .catch(() => setServers([]))
                .finally(() => setServersLoading(false));
        } else {
            setServers([]);
        }
    }, [entity?.id, category]);

    useEffect(() => {
        import("@marzneshin/common/utils")
            .then(({ fetch }) => fetch("/proxy-pool/subscriptions?category=bridge"))
            .then((data) => setBridgeSubs(data || []))
            .catch(() => setBridgeSubs([]));
    }, []);

    return (
        <Dialog open={open} onOpenChange={onOpenChange} defaultOpen={true}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="text-primary">
                        {entity
                            ? t("page.proxy-pools.dialogs.edition.title")
                            : t("page.proxy-pools.dialogs.creation.title")}
                    </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={handleSubmit}>
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem className="w-full">
                                    <FormLabel>{t("name")}</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="url"
                            render={({ field }) => (
                                <FormItem className="w-full">
                                    <FormLabel>{t("page.proxy-pools.fields.url")}</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="vless://..." />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <HStack>
                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem className="w-1/2">
                                        <FormLabel>{t("type")}</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="vless">vless</SelectItem>
                                                <SelectItem value="vmess">vmess</SelectItem>
                                                <SelectItem value="trojan">trojan</SelectItem>
                                                <SelectItem value="subscription">subscription</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="category"
                                render={({ field }) => (
                                    <FormItem className="w-1/2">
                                        <FormLabel>{t("category")}</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="bridge">{t("category.bridge")}</SelectItem>
                                                <SelectItem value="external">{t("category.external")}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </HStack>
                        <HStack>
                            <FormField
                                control={form.control}
                                name="routing_mode"
                                render={({ field }) => (
                                    <FormItem className="w-1/2">
                                        <FormLabel>{t("page.proxy-pools.routing_mode")}</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="direct">{t("routing_mode.direct")}</SelectItem>
                                                <SelectItem value="via_node">{t("routing_mode.via_node")}</SelectItem>
                                                <SelectItem value="both">{t("routing_mode.both")}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="is_active"
                                render={({ field }) => (
                                    <FormItem className="w-1/2 flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                        <div className="space-y-0.5">
                                            <FormLabel>{t("active")}</FormLabel>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </HStack>
                        <FormField
                            control={form.control}
                            name="bridge_naming_template"
                            render={({ field }) => (
                                <FormItem className="w-full">
                                    <FormLabel>{t("page.proxy-pools.bridge_naming_template")}</FormLabel>
                                    <FormControl>
                                        <Input {...field} value={field.value || ""} placeholder="Bridge ({server_name})" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {category === "bridge" && (
                            <FormField
                                control={form.control}
                                name="preferred_bridge_server_id"
                                render={({ field }) => (
                                    <FormItem className="w-full">
                                        <FormLabel>{t("page.proxy-pools.preferred_server")}</FormLabel>
                                        <FormControl>
                                            <Select
                                                onValueChange={(val) => field.onChange(val === "null" ? null : Number(val))}
                                                defaultValue={field.value?.toString() || "null"}
                                                disabled={!entity || serversLoading}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={
                                                        entity
                                                            ? t("page.proxy-pools.preferred_server_placeholder")
                                                            : t("page.proxy-pools.preferred_server_create_hint")
                                                    } />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="null">
                                                        {t("page.proxy-pools.preferred_server_auto")}
                                                    </SelectItem>
                                                    {servers.map((srv) => (
                                                        <SelectItem key={srv.id} value={String(srv.id)}>
                                                            {srv.name || `${srv.address}:${srv.port}`}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                        {category === "external" && routingMode === "via_node" && (
                            <FormField
                                control={form.control}
                                name="bridge_subscription_id"
                                render={({ field }) => (
                                    <FormItem className="w-full">
                                        <FormLabel>{t("page.proxy-pools.bridge_subscription")}</FormLabel>
                                        <FormControl>
                                            <Select
                                                onValueChange={(val) => field.onChange(val === "null" ? null : Number(val))}
                                                defaultValue={field.value?.toString() || "null"}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t("page.proxy-pools.bridge_subscription_placeholder")} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="null">
                                                        {t("page.proxy-pools.bridge_subscription_auto")}
                                                    </SelectItem>
                                                    {bridgeSubs.map((bsub) => (
                                                        <SelectItem key={bsub.id} value={String(bsub.id)}>
                                                            {bsub.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                        <Button
                            className="mt-3 w-full font-semibold"
                            type="submit"
                            disabled={form.formState.isSubmitting}
                        >
                            {t("submit")}
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};
