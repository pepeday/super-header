import { defineInterface } from '@directus/extensions-sdk';
import InterfaceComponent from './superHeader.vue';

export default defineInterface({
	id: 'super-header',
	name: 'Super Header',
	icon: 'page_header',
	description:
		'Create a header with a title, subtitle, help information, and/or actions to help users navigate or run Flows.',
	component: InterfaceComponent,
	options: (context) => [
		{
			field: 'title',
			name: 'Title',
			type: 'string',
			meta: {
				width: 'full',
				interface: 'system-display-template',
				options: {
					collectionName: context.collection,
				},
				note: 'Enter a title, or leave it blank to only show a line. You can also include fields from the current item. NOTE: this interface ONLY supports root level fields, it does NOT support showing relational fields.',
			},
		},
		{
			field: 'color',
			name: 'Color',
			type: 'string',
			meta: {
				width: 'half',
				interface: 'select-color',
				note: 'Select a color for the title and icon.',
				options: {},
			},
		},
		{
			field: 'icon',
			name: 'Icon',
			type: 'string',
			meta: {
				width: 'half',
				interface: 'select-icon',
				note: 'Select an icon to display next to the title.',
			},
		},
		{
			field: 'subtitle',
			name: 'Subtitle',
			type: 'string',
			meta: {
				width: 'full',
				interface: 'system-display-template',
				options: {
					collectionName: context.collection,
				},
				note: 'Enter a subtitle for additional context. You can also include fields from the current item. NOTE: this interface ONLY supports root level fields, it does NOT support showing relational fields.',
			},
		},
		{
			field: 'helpKey',
			name: 'Help translation key',
			type: 'string',
			meta: {
				width: 'full',
				note: 'Add help information to guide users. Uses directus_translations collection. You can choose the display field by setting the Help Field',
				interface: 'input',
				options: {
					placeholder: 'Enter translation key (e.g., help_inspections)',
				}
			}
		},
		{
			field: 'helpField',
			name: 'Help Field',
			type: 'string',
			meta: {
				width: 'full',
				interface: 'system-field',
				options: {
					collectionName: 'directus_translations',
					allowPrimaryKey: false,
				},
			},
		},
		{
			field: 'actionButton',
			name: 'Action button label',
			type: 'string',
			meta: {
				width: 'full',
				interface: 'system-input-translated-string',
				options: {
					placeholder: 'Label for the button',
				}
			}
		},

		{
			field: 'actions',
			name: 'Actions',
			type: 'json',
			meta: {
				interface: 'list',
				note: 'Add actions to the divider to help users navigate or run Flows.  If there are more than one action, actions will be displayed in a dropdown menu.',
				options: {
					fields: [
						{
							field: 'label',
							type: 'string',
							name: 'label',
							meta: {
								width: 'full',
								interface: 'system-input-translated-string',
								note: 'What the user will see on the button.',
								options: {
									placeholder: 'label',
								},
							},
						},
						{
							field: 'icon',
							name: 'icon',
							type: 'string',
							meta: {
								width: 'half',
								note: 'Select an icon to display next to the label.',
								interface: 'select-icon',
							},
						},
						{
							field: 'type',
							name: 'type',
							type: 'string',
							meta: {
								width: 'half',
								note: 'Select a type to style the button.',
								interface: 'select-dropdown',
								default_value: 'normal',
								options: {
									choices: [
										{ text: 'Primary', value: 'primary' },
										{ text: 'Normal', value: 'normal' },
										{ text: 'Info', value: 'info' },
										{ text: 'Success', value: 'success' },
										{ text: 'Warning', value: 'warning' },
										{ text: 'Danger', value: 'danger' },
									],
								},
							},
							schema: {
								default_value: 'normal',
							},
						},
						{
							field: 'actionType',
							name: 'Action Type',
							type: 'string',
							meta: {
								width: 'half',
								interface: 'select-dropdown',
								note: 'Select the action type.',
								options: {
									choices: [
										{ text: 'Link', value: 'link' },
										{ text: 'Flow', value: 'flow' },
										{text: 'Create anywhere', value: 'create_anywhere'}
									],
								},
							},
							schema: {
								default_value: 'link',
							},
						},
						{
							field: 'url',
							type: 'string',
							name: '$t:url',
							meta: {
								width: 'full',
								interface: 'system-display-template',
								note: 'Enter a URL to navigate to when the button is clicked. You can include fields from the current item as variables. For example: https://example.com/articles/{{ id }}/{{ slug }}. NOTE: this interface ONLY supports root level fields, it does NOT support showing relational fields.',
								options: {
									collectionName: context.collection,
									font: 'monospace',
									placeholder: 'https://example.com/articles/{{ id }}/{{ slug }}',
								},
								hidden: true,
								conditions: [
									{
										rule: {
											actionType: {
												_eq: 'link',
											},
										},
										hidden: false,
									},
								],
							},
						},
						{
							field: 'flow',
							type: 'string',
							name: 'Flow',
							meta: {
								width: 'full',
								interface: 'collection-item-dropdown',
								note: 'Select a Flow to run when the button is clicked.',
								hidden: true,
								options: {
									selectedCollection: 'directus_flows',
									placeholder: 'Select a flow',
									template: '{{ name }}',
								},
								conditions: [
									{
										rule: {
											actionType: {
												_eq: 'flow',
											},
										},
										hidden: false,
									},
								],
							},
						},

						// Create anywhere button

						{
							field: 'selectedCollection',
							name: 'Target Collection',
							type: 'string',
							meta: {
								width: 'full',
								interface: 'system-collection',
								hidden: true, // Hidden by default
								conditions: [
									{
										rule: {
											actionType: { _eq: 'create_anywhere' },
										},
										hidden: false, // Shown when type is "create_anywhere"
									},
								],
							},
						},
						{
							field: 'defaultFields',
							name: 'Default Values',
							type: 'json',
							meta: {
								width: 'full',
								interface: 'list',
								hidden: true, // Hidden by default
								options: {
									template: '{{ field }}: {{ value }}',
									fields: [
										{
											field: 'field',
											name: 'Field',
											type: 'string',
											meta: {
												width: 'half',
												interface: 'system-field',
												options: {
													collectionName: context.collection,
													allowPrimaryKey: false,
												},
											},
										},
										{
											field: 'value',
											name: 'Value Template',
											type: 'string',
											meta: {
												width: 'half',
												interface: 'system-display-template',
												options: {
													collectionName: context.collection,
													placeholder: 'Enter static value or {{ field }}',
												},
											},
										},
									],
								},
								conditions: [
									{
										rule: {
											actionType: { _eq: 'create_anywhere' },
										},
										hidden: false, // Shown when type is "create_anywhere"
									},
								],
							},
							schema: {
								default_value: [],
							},
						},

						// Create anywhere button end


					],
				},
			},
		},
	],
	types: ['alias'],
	localTypes: ['presentation'],
	group: 'presentation',
	autoKey: true,
	hideLabel: true,
});