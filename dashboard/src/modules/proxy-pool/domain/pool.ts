import { z } from "zod";

export const PoolTypeSchema = z.enum(["vless", "vmess", "trojan", "subscription"]);
export const PoolCategorySchema = z.enum(["bridge", "external"]);
export const RoutingModeSchema = z.enum(["direct", "via_node", "both"]);

export const PoolSchema = z.object({
    id: z.number(),
    name: z.string().min(1),
    url: z.string().min(1),
    type: PoolTypeSchema,
    category: PoolCategorySchema,
    routing_mode: RoutingModeSchema,
    is_active: z.boolean(),
    last_sync_at: z.string().datetime().nullable(),
    created_at: z.string().datetime(),
    admin_id: z.number().nullable(),
});

export const PoolServerSchema = z.object({
    id: z.number(),
    subscription_id: z.number(),
    protocol: z.string().nullable(),
    name: z.string().nullable(),
    address: z.string().nullable(),
    port: z.number().nullable(),
    uuid: z.string().nullable(),
    security: z.string().nullable(),
    network: z.string().nullable(),
    latency_ms: z.number().nullable(),
    last_tested_at: z.string().datetime().nullable(),
    is_available: z.boolean(),
    created_at: z.string().datetime(),
});

export const PoolMutationSchema = z.object({
    id: z.number().optional(),
    name: z.string().min(1, "Name is required"),
    url: z.string().min(1, "URL is required"),
    type: PoolTypeSchema,
    category: PoolCategorySchema,
    routing_mode: RoutingModeSchema,
    is_active: z.boolean().default(true),
});

export type PoolType = z.infer<typeof PoolTypeSchema>;
export type PoolCategory = z.infer<typeof PoolCategorySchema>;
export type RoutingMode = z.infer<typeof RoutingModeSchema>;
export type Pool = z.infer<typeof PoolSchema>;
export type PoolServer = z.infer<typeof PoolServerSchema>;
export type PoolMutationType = z.infer<typeof PoolMutationSchema>;
