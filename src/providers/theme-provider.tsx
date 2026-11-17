import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
    /** Tema em uso: o escolhido pela pessoa ou, sem escolha, o padrão da tela. */
    theme: Theme;
    /** Escolha da pessoa: fica gravada e vale em qualquer tela. */
    setTheme: (theme: Theme) => void;
    /** Padrão da tela atual, usado só enquanto a pessoa não escolheu (ex.: o Backstage começa escuro). */
    setPadrao: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);

    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }

    return context;
};

interface ThemeProviderProps {
    children: ReactNode;
    /**
     * The class to add to the root element when the theme is dark
     * @default "dark-mode"
     */
    darkModeClass?: string;
    /**
     * The default theme to use if no theme is stored in localStorage
     * @default "system"
     */
    defaultTheme?: Theme;
    /**
     * The key to use to store the theme in localStorage
     * @default "ui-theme"
     */
    storageKey?: string;
}

export const ThemeProvider = ({ children, defaultTheme = "system", storageKey = "ui-theme", darkModeClass = "dark-mode" }: ThemeProviderProps) => {
    // Escolha gravada (inclusive "system") e padrão da tela; sem escolha, vale o padrão.
    const [salvo, setSalvo] = useState<Theme | null>(() => (typeof window !== "undefined" ? (localStorage.getItem(storageKey) as Theme | null) : null));
    const [padrao, setPadrao] = useState<Theme>(defaultTheme);
    const theme = salvo ?? padrao;
    const setTheme = (t: Theme) => {
        setSalvo(t);
        localStorage.setItem(storageKey, t);
    };

    useEffect(() => {
        const applyTheme = () => {
            const root = window.document.documentElement;

            if (theme === "system") {
                const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

                root.classList.toggle(darkModeClass, systemTheme === "dark");
            } else {
                root.classList.toggle(darkModeClass, theme === "dark");
            }
        };

        applyTheme();

        // Listen for system theme changes
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

        const handleChange = () => {
            if (theme === "system") {
                applyTheme();
            }
        };

        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, [theme]);

    return <ThemeContext.Provider value={{ theme, setTheme, setPadrao }}>{children}</ThemeContext.Provider>;
};
