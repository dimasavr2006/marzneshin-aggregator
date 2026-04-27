import { createContext, useContext } from "react";
import { Pool } from "@marzneshin/modules/proxy-pool";

interface RouterPoolContextProps {
    pool: Pool;
}

export const RouterPoolContext = createContext<RouterPoolContextProps | null>(null);

export const useRouterPoolContext = () => {
    const ctx = useContext(RouterPoolContext);
    return ctx;
};
