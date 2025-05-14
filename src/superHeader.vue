<script setup lang="ts">
import { ref, computed, inject, Component, nextTick, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStores, useApi } from '@directus/extensions-sdk';

import LinkAction from './components/LinkAction.vue';
import FlowAction from './components/FlowAction.vue';
import CreateAnywhere from './components/CreateAnywhere.vue';
import SwitchBU from './components/SwitchBU.vue';
import GeneratePdfAction from './components/GeneratePdfAction.vue';

import type { SuperHeaderProps, Action, FlowIdentifier } from './types';
import { useTranslation } from './composables/getTranslation';

const props = withDefaults(defineProps<SuperHeaderProps>(), {
	actions: () => [],
	helpKey: '',
	helpField: '',
	
});


const api = useApi();
const currentTeam = ref('');

const fetchCurrentTeam = async () => {
  try {
    const response = await api.get('/users/me', {
      params: {
        fields: [
          'team.name',
          'team.id'
        ]
      }
    });
    
    const team = response.data.data.team;
    currentTeam.value = team?.name || t('no_team', 'No Team');

  } catch (error) {
    console.error('Error fetching team:', JSON.stringify(error, null, 2));
    currentTeam.value = t('no_team', 'No Team');
  }
};

onMounted(async () => {
  await fetchCurrentTeam();
});

const { t } = useI18n();
const { useFieldsStore, useNotificationsStore } = useStores();
const fieldsStore = useFieldsStore();
const notificationsStore = useNotificationsStore();
const values = inject('values', ref<Record<string, any>>({}));

// Use the refs in useTranslation
const { translation, loading } = useTranslation(props.helpKey, props.helpField);


const expanded = ref(false);
const flowFormData = ref<Record<string, any>>({});

const dynamicComponent = ref<Component | null>(null);
const componentProps = ref<{ action: Action } | null>(null);
const dynamicComponentRef = ref<{ triggerAction: () => void } | null>(null);

const toggleHelp = () => {
	expanded.value = !expanded.value;
};


const actionList = computed(() => {
	const formattedActions = props.actions.map((action) => {
		const { actionType, label, icon, type, ...otherProps } = action;
		const formattedAction = {
			actionType,
			label,
			icon,
			type,
			collection: action.collection || props.collection,
			meta: {
				...otherProps,
			}
		};
		return formattedAction;
	});
	return formattedActions;
});

const emit = defineEmits(['action-clicked', 'action-triggered']);

// Change to a Map to track loading state per action type
const actionLoadingStates = ref(new Map<string, boolean>());

const handleActionClick = async (action: Action) => {
	// Dynamically load the component for the action type
	dynamicComponent.value = getComponentForAction(action.actionType);
	
	// Bind the action data with collection
	componentProps.value = {
		action: {
			...action,
			collection: action.collection || props.collection
		}
	};

	// Wait for the next tick to ensure the component is mounted
	await nextTick();
	
	// Set loading state for this specific action
	actionLoadingStates.value.set(action.actionType, true);
	
	try {
		// Call the child component's method
		await dynamicComponentRef.value?.triggerAction();
	} finally {
		actionLoadingStates.value.set(action.actionType, false);
	}
	
	// Emit the event
	emit('action-triggered', action);
};

// Change from returning a computed to a direct function
const isActionLoading = (actionType: string): boolean => {
    return actionLoadingStates.value.get(actionType) ?? false;
};

const getComponentForAction = (actionType: string) => {
	switch (actionType) {
		case 'link':
			return LinkAction;
		case 'flow':
			return FlowAction;
		case 'create_anywhere':
			return CreateAnywhere;
		case 'switch_bu':
			return SwitchBU;
		case 'generate_pdf':
			return GeneratePdfAction;
		default:
			console.warn(`Unknown action type: ${actionType}`);
			return null;
	}
};


const flowIdentifiers = () => {
	if (!actionList.value || !actionList.value?.length) return [];

	return actionList.value
		.filter((action) => action.actionType === 'flow' && action.flow)
		.map((action) => action.flow as FlowIdentifier);
};



const hasMultipleActions = computed(() => {
	if (!actionList.value || !actionList.value?.length) return false;
	return actionList.value?.length > 1;
});

const primaryAction = computed(() => {
	if (!actionList.value || !actionList.value?.length) return null;
	return actionList.value[0] || null;
});

const fields = computed(() => {
	return fieldsStore.getFieldsForCollection(props.collection);
});

const handleSwitchTeam = async () => {
	dynamicComponent.value = SwitchBU;
	componentProps.value = {
		action: {
			actionType: 'switch_bu',
			collection: props.collection,
			meta: {}
		}
	};
	
	await nextTick();
	dynamicComponentRef.value?.triggerAction();
};

const copyCurrentUrl = () => {
	navigator.clipboard.writeText(window.location.href);
	notificationsStore.add({
		title: t('Copied to clipboard'),
		icon: 'content_copy',
		type: 'success'
	});
};

</script>

<template>
	<div class="page-header">
		<div class="header-content" :style="{ '--header-color': color }">
			<div class="global-actions">
				<v-button 
					v-if="helpKey && translation" 
					secondary 
					small
					icon
					@click="toggleHelp"
				>
					<v-icon :name="expanded ? 'expand_less' : 'help_outline'" />
				</v-button>

				<v-button
					secondary
					small
					icon
					@click="copyCurrentUrl"
				>
					<v-icon name="content_copy" />
				</v-button>
			</div>

			<div class="actions">
				


				<v-button 
					small
					secondary 
					@click="handleSwitchTeam"
				>
					{{currentTeam}}
					<v-icon name="swap_horiz" right />
				</v-button>

				<template v-if="!hasMultipleActions && primaryAction">
					
					<v-button
						:type="primaryAction.type"
						small
						:loading="isActionLoading(primaryAction.actionType)"
						@click="handleActionClick(primaryAction)"
					>
						{{ primaryAction.label }}
						<v-icon v-if="primaryAction.icon" :name="primaryAction.icon" right />
					</v-button>

				</template>

				<template v-else-if="hasMultipleActions">
					<v-button
						v-for="action in actionList"
						:key="action.actionType"
						:type="action.type"
						small
						:loading="isActionLoading(action.actionType)"
						@click="handleActionClick(action)"
					>
						{{ action.label }}
						<v-icon v-if="action.icon" :name="action.icon" right />
					</v-button>
				</template>

				<component
				v-if="dynamicComponent"
				ref="dynamicComponentRef"
				v-bind="componentProps"
				:is="dynamicComponent"
				>
				</component>


			</div>
		</div>
		<transition-expand>
			<!-- Debug info -->
			<div v-if="expanded && translation" class="help-text">
				<div v-if="loading">Loading...</div>
				<div v-else-if="translation" v-html="translation"></div>
			</div>
		</transition-expand>
	</div>

	<!-- Flow Form Modal -->
	<v-dialog v-model="showForm">
		<v-card>
			<v-card-title>{{ currentFlow?.name || 'Run Flow' }}</v-card-title>
			<v-card-text>
				<v-form v-if="currentFlow?.options?.fields" v-model="flowFormData"
					:fields="currentFlow.options.fields" />
			</v-card-text>
			<v-card-actions>
				<v-button secondary @click="showForm = false">
					{{ t('cancel') }}
				</v-button>
				<v-button @click="
					submitFlow({
						collection: currentFlow.collection,
						key: currentFlow.key,
						...flowFormData,
					})
					">
					{{ t('run_flow') }}
				</v-button>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<style scoped lang="scss">
.actions {
	display: flex;
	gap: 8px;
	align-items: flex-start;
}

.header-content {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	padding-bottom: 8px;
	color: var(--header-color, var(--theme--foreground));
}

.icon {
	--v-icon-color: var(--header-color);
}

.global-actions {
	display: flex;
	gap: 8px;
	align-items: center;

	.v-icon {
		--v-icon-color: var(--header-color);
	}
}

.help-text {
	padding-block: 16px;

	:deep(img) {
		border-radius: 8px;
		max-height: 100%;
		max-width: 100%;
		object-fit: cover;
	}
}
</style>
