import { type FC, useEffect } from "react";
import { DeleteConfirmation } from "@marzneshin/common/components";
import { usePoolsDeletionMutation } from "@marzneshin/modules/proxy-pool";

interface DeleteConfirmationDialogProps {
    open: boolean;
    onOpenChange: (state: boolean) => void;
    entity: { id: number; name: string };
    onClose: () => void;
}

export const DeleteConfirmationDialog: FC<DeleteConfirmationDialogProps> = ({
    open,
    onOpenChange,
    entity,
    onClose,
}) => {
    const deleteMutation = usePoolsDeletionMutation();

    useEffect(() => {
        if (!open) onClose();
    }, [open, onClose]);

    return (
        <DeleteConfirmation
            open={open}
            onOpenChange={onOpenChange}
            action={() => deleteMutation.mutate(entity.id)}
        />
    );
};
