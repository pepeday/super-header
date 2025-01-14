export interface FlowIdentifier {
	collection: string;
	key: string;
}

export interface DefaultField {
	field: string;
	value: string;
}

export interface Action {
	label: string;
	icon?: string;
	type?: string;
	actionType: 'link' | 'flow' | 'create_anywhere';
	url?: string;
	flow?: FlowIdentifier;
	// Properties for create_anywhere
	selectedCollection?: string;
	defaultFields?: DefaultField[];
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
