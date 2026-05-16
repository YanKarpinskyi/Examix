import type { Role } from "@zno/shared";
import { supabase } from "./supabaseClient";

export const adminService = {
    async updateUserRole(userId: string, newRole: Role) {
        const { error } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('id', userId);
        if (error) throw error;
    }
};