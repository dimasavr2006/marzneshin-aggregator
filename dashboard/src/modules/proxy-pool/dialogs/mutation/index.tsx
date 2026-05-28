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
    Checkbox,
} from "@marzneshin/common/components";
import { useTranslation } from "react-i18next";
import {
    PoolMutationSchema,
    usePoolsCreationMutation,
    usePoolsUpdateMutation,
} from "../..";
import type { Pool } from "../..";
import { useMutationDialog, MutationDialogProps } from "@marzneshin/common/hooks";

type PoolServerOption = {
    id: number;
    name: string | null;
    address: string | null;
    port: number | null;
};

export const MutationDialog: FC<MutationDialogProps<Pool>> = ({
    entity,
    onClose,
}) => {
    const updateMutation = usePoolsUpdateMutation();
    const createMutation = usePoolsCreationMutation();
    const { t } = useTranslation();
    const [servers, setServers] = useState<PoolServerOption[]>([]);
    const [serversLoading, setServersLoading] = useState(false);
    const [bridgeSubs, setBridgeSubs] = useState<Pool[]>([]);

    const defaultValue = useMemo(() => ({
        name: "",
        url: "",
        type: "vless" as const,
        category: "bridge" as const,
        routing_mode: "via_node" as const,
        bridge_naming_template: null as string | null,
        preferred_bridge_server_id: null as number | null,
        bridge_subscription_id: null as number | null,
        server_selection_mode: "all" as const,
        selected_server_ids: [] as number[],
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
    const type = form.watch("type");
    const routingMode = form.watch("routing_mode");
    const selectionMode = form.watch("server_selection_mode");
    const selectedServerIds = form.watch("selected_server_ids") || [];

    const isExternalSubscription =
        category === "external" && type === "subscription";

    useEffect(() => {
        if (category === "bridge") {
            if (routingMode !== "via_node") {
                form.setValue("routing_mode", "via_node", { shouldValidate: true });
            }
            if (selectionMode !== "all") {
                form.setValue("server_selection_mode", "all", { shouldValidate: true });
            }
            if ((selectedServerIds || []).length > 0) {
                form.setValue("selected_server_ids", [], { shouldValidate: true });
            }
        }
    }, [category, routingMode, selectionMode, selectedServerIds, form]);

    useEffect(() => {
        if (selectionMode !== "selected" && (selectedServerIds || []).length > 0) {
            form.setValue("selected_server_ids", [], { shouldValidate: true });
        }
    }, [selectionMode, selectedServerIds, form]);

    useEffect(() => {
        if (!entity?.id) {
            setServers([]);
            return;
        }

        if (category !== "bridge" && category !== "external") {
            setServers([]);
            return;
        }

        setServersLoading(true);
        import("@marzneshin/modules/proxy-pool")
            .then(({ fetchPoolServers }) => fetchPoolServers(entity.id))
            .then((data: PoolServerOption[]) => setServers(data))
            .catch(() => setServers([]))
            .finally(() => setServersLoading(false));
    }, [entity?.id, category]);

    useEffect(() => {
        const serverIds = new Set(servers.map((srv) => srv.id));
        const preferred = form.getValues("preferred_bridge_server_id");
        if (preferred !== null && preferred !== undefined && !serverIds.has(preferred)) {
            form.setValue("preferred_bridge_server_id", null, { shouldValidate: true });
        }
        if ((selectedServerIds || []).length > 0) {
            const normalized = selectedServerIds.filter((id: number) => serverIds.has(id));
            if (normalized.length !== selectedServerIds.length) {
                form.setValue("selected_server_ids", normalized, { shouldValidate: true });
            }
        }
    }, [servers, selectedServerIds, form]);

    useEffect(() => {
        import("@marzneshin/common/utils")
            .then(({ fetch }) => fetch("/proxy-pool/subscriptions?category=bridge"))
            .then((data) => setBridgeSubs(data || []))
            .catch(() => setBridgeSubs([]));
    }, []);

    return (
        <Dialog open={open} onOpenChange={onOpenChange} defaultOpen={true}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="text-primary">
                        {entity
                            ? t("page.proxy-pools.dialogs.edition.title")
                            : t("page.proxy-pools.dialogs.creation.title")}
                    </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={handleSubmit} className="space-y-3">
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
                                        <Select
                                            value={field.value}
                                            onValueChange={field.onChange}
                                        >
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
                                        <Select
                                            value={field.value}
                                            onValueChange={field.onChange}
                                        >
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
                                        <Select
                                            value={field.value}
                                            onValueChange={field.onChange}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {category === "bridge" ? (
                                                    <SelectItem value="via_node">{t("routing_mode.via_node")}</SelectItem>
                                                ) : (
                                                    <>
                                                        <SelectItem value="direct">{t("routing_mode.direct")}</SelectItem>
                                                        <SelectItem value="via_node">{t("routing_mode.via_node")}</SelectItem>
                                                        <SelectItem value="both">{t("routing_mode.both")}</SelectItem>
                                                    </>
                                                )}
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
                                    <FormItem className="w-1/2 flex flex-row items-center justify-between rounded-md border px-3 py-2">
                                        <FormLabel>{t("active")}</FormLabel>
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
                                    <FormLabel>
                                        {category === "external"
                                            ? t("page.proxy-pools.name_template")
                                            : t("page.proxy-pools.bridge_naming_template")}
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            value={field.value || ""}
                                            placeholder={
                                                category === "external"
                                                    ? "{sub_name} | {server_name}"
                                                    : "Bridge ({server_name})"
                                            }
                                        />
                                    </FormControl>
                                    <p className="text-xs text-muted-foreground">
                                        {t("page.proxy-pools.name_template_hint")}
                                    </p>
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
                                                value={field.value?.toString() || "null"}
                                                onValueChange={(val) => field.onChange(val === "null" ? null : Number(val))}
                                                disabled={!entity || serversLoading}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue
                                                        placeholder={
                                                            entity
                                                                ? t("page.proxy-pools.preferred_server_placeholder")
                                                                : t("page.proxy-pools.preferred_server_create_hint")
                                                        }
                                                    />
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

                        {isExternalSubscription && (
                            <>
                                <FormField
                                    control={form.control}
                                    name="server_selection_mode"
                                    render={({ field }) => (
                                        <FormItem className="w-full">
                                            <FormLabel>{t("page.proxy-pools.selection_mode")}</FormLabel>
                                            <FormControl>
                                                <Select
                                                    value={field.value}
                                                    onValueChange={field.onChange}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">
                                                            {t("page.proxy-pools.selection_mode.all")}
                                                        </SelectItem>
                                                        <SelectItem value="manual">
                                                            {t("page.proxy-pools.selection_mode.manual")}
                                                        </SelectItem>
                                                        <SelectItem value="selected">
                                                            {t("page.proxy-pools.selection_mode.selected")}
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {selectionMode === "manual" && (
                                    <FormField
                                        control={form.control}
                                        name="preferred_bridge_server_id"
                                        render={({ field }) => (
                                            <FormItem className="w-full">
                                                <FormLabel>{t("page.proxy-pools.manual_server")}</FormLabel>
                                                <FormControl>
                                                    <Select
                                                        value={field.value?.toString() || "null"}
                                                        onValueChange={(val) =>
                                                            field.onChange(val === "null" ? null : Number(val))
                                                        }
                                                        disabled={!entity || serversLoading}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue
                                                                placeholder={
                                                                    entity
                                                                        ? t("page.proxy-pools.manual_server_placeholder")
                                                                        : t("page.proxy-pools.selected_servers_create_hint")
                                                                }
                                                            />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="null">
                                                                {t("page.proxy-pools.manual_server_auto")}
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

                                {selectionMode === "selected" && (
                                    <FormField
                                        control={form.control}
                                        name="selected_server_ids"
                                        render={({ field }) => (
                                            <FormItem className="w-full">
                                                <FormLabel>{t("page.proxy-pools.selected_servers")}</FormLabel>
                                                <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
                                                    {serversLoading ? (
                                                        <p className="text-xs text-muted-foreground">
                                                            {t("loading")}
                                                        </p>
                                                    ) : !entity ? (
                                                        <p className="text-xs text-muted-foreground">
                                                            {t("page.proxy-pools.selected_servers_create_hint")}
                                                        </p>
                                                    ) : servers.length === 0 ? (
                                                        <p className="text-xs text-muted-foreground">
                                                            {t("page.proxy-pools.no_servers")}
                                                        </p>
                                                    ) : (
                                                        servers.map((srv) => {
                                                            const value = Array.isArray(field.value)
                                                                ? field.value
                                                                : [];
                                                            const checked = value.includes(srv.id);
                                                            const label = srv.name || `${srv.address}:${srv.port}`;
                                                            return (
                                                                <label
                                                                    key={srv.id}
                                                                    className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted/40"
                                                                >
                                                                    <Checkbox
                                                                        checked={checked}
                                                                        onCheckedChange={(state) => {
                                                                            const current = Array.isArray(field.value)
                                                                                ? field.value
                                                                                : [];
                                                                            const next = state === true
                                                                                ? [...current, srv.id]
                                                                                : current.filter((id) => id !== srv.id);
                                                                            field.onChange(next);
                                                                        }}
                                                                    />
                                                                    <span>{label}</span>
                                                                </label>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    {t("page.proxy-pools.selected_servers_hint")}
                                                </p>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                            </>
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
                                                value={field.value?.toString() || "null"}
                                                onValueChange={(val) => field.onChange(val === "null" ? null : Number(val))}
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
                            className="mt-1 w-full font-semibold"
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
