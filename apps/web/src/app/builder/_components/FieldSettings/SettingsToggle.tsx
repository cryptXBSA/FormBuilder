import React from "react";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { useAppState } from "@/state/state";

interface SettingsToggleProps {
	onClick: any;
}

export function SettingsToggle({ onClick }: SettingsToggleProps) {
	const state = useAppState();
	return (
		<div className="flex justify-between p-2 px-24">
			<h3 className="scroll-m-20 font-semibold text-2xl tracking-tight">
				{state.currentForm.name}
			</h3>
			<Button className="gap-1" onClick={onClick}>
				<Settings />
				Settings
			</Button>
		</div>
	);
}
