export interface FlowIdentifier {
	collection: string;
	key: string;
}

export interface DefaultField {
	field: string;
	value: string;
}

export interface Action {
    actionType: string; // The type of action (e.g., 'link', 'flow', 'create_anywhere')
    meta?: Record<string, any>; // Additional data or configuration for the action
    label?: string; // The label to display for the action
    icon?: string; // An optional icon for the action
    type?: string; // Optional button or UI styling type
	collection?: string;
}

export interface ActionComponent {
    action: Action; // The action object
    onActionTriggered?: (action: Action) => void; // Optional callback for additional handling
}

export interface SuperHeaderProps {
	icon?: string;
	title?: string;
	subtitle?: string;
	actions?: Action[];
	help?: string;
	values: Record<string, any>;
	color?: string;
	collection: string;
	primaryKey: string;
}

