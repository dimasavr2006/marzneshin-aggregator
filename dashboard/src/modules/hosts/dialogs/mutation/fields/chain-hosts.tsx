import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    Checkbox,
} from "@marzneshin/common/components";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { fetch } from "@marzneshin/common/utils";
import { HostType } from "@marzneshin/modules/hosts";

const fetchAllHosts = async (): Promise<HostType[]> => {
    const result = await fetch("/inbounds/hosts", {
        query: { size: 1000 },
    });
    return result.items || [];
};

export const ChainHostsField = () => {
    const { t } = useTranslation();
    const form = useFormContext();
    const { data: hosts = [] } = useQuery({
        queryKey: ["all-hosts-for-chain"],
        queryFn: fetchAllHosts,
    });

    const currentHostId = form.watch("id");

    return (
        <FormField
            control={form.control}
            name="chain_ids"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>{t("page.hosts.chain_hosts")}</FormLabel>
                    <FormControl>
                        <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                            {hosts
                                .filter((host: HostType) => host.id !== currentHostId)
                                .map((host: HostType) => (
                                    <div
                                        key={host.id}
                                        className="flex items-center space-x-2"
                                    >
                                        <Checkbox
                                            checked={field.value?.includes(host.id)}
                                            onCheckedChange={(checked) => {
                                                const current = field.value || [];
                                                if (checked) {
                                                    field.onChange([...current, host.id]);
                                                } else {
                                                    field.onChange(
                                                        current.filter((id: number) => id !== host.id)
                                                    );
                                                }
                                            }}
                                        />
                                        <span className="text-sm">
                                            {host.remark} ({host.address}:{host.port})
                                        </span>
                                    </div>
                                ))}
                            {hosts.length === 0 && (
                                <p className="text-sm text-muted-foreground">
                                    {t("page.hosts.no_hosts_available")}
                                </p>
                            )}
                        </div>
                    </FormControl>
                </FormItem>
            )}
        />
    );
};
