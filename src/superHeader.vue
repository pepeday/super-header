<script setup lang="ts">
import { ref, computed, inject, Component, nextTick, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStores, useApi } from '@directus/extensions-sdk';

import LinkAction from './components/LinkAction.vue';
import FlowAction from './components/FlowAction.vue';
import CreateAnywhere from './components/CreateAnywhere.vue';
import SwitchBU from './components/SwitchBU.vue';

import type { SuperHeaderProps, Action, FlowIdentifier } from './types';
import { useTranslation } from './composables/getTranslation';

const props = withDefaults(defineProps<SuperHeaderProps>(), {
	actions: () => [],
	helpKey: '',
	helpField: '',
	
});

const api = useApi();
const currentBusinessUnitName = ref('');

const fetchCurrentBusinessUnit = async () => {
  try {
    const response = await api.get('/users/me', {
      params: {
        fields: ['business_unit_owner_id.name','business_unit_owner_id.organization_id.name']
      }
    });
    
	currentBusinessUnitName.value = response.data.data.business_unit_owner_id.name;

  } catch (error) {
    console.error('Error fetching business unit:', error);
  }
};

onMounted(async () => {
  await fetchCurrentBusinessUnit();
});

const { t } = useI18n();
const { useFieldsStore } = useStores();
const fieldsStore = useFieldsStore();
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
			collection: props.collection,
			meta: {
				...otherProps,
			}
		};
		return formattedAction;
	});
	return formattedActions;
});

const emit = defineEmits(['action-clicked', 'action-triggered']);
const handleActionClick = async (action: Action) => {
    // Dynamically load the component for the action type
    dynamicComponent.value = getComponentForAction(action.actionType);
    
    // Bind the action data
    componentProps.value = {
        ...action
    };

    // Wait for the next tick to ensure the component is mounted
    await nextTick();
    
    // Call the child component's method
    dynamicComponentRef.value?.triggerAction();
    
    // Emit the event
    emit('action-triggered', action);
};




const getComponentForAction = (actionType: string) => {
    switch (actionType) {
        case 'link':
            return LinkAction; // Return the actual component, not a string
        case 'flow':
            return FlowAction;
        case 'create_anywhere':
            return CreateAnywhere;
        case 'switch_bu':
            return SwitchBU;
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

const handleSwitchBU = async () => {
    dynamicComponent.value = SwitchBU;
    componentProps.value = {
        collection: props.collection
    };
    
    await nextTick();
    dynamicComponentRef.value?.triggerAction();

	
};

</script>

<template>
	<div class="page-header">
		<div class="header-content" :style="{ '--header-color': color }">
			<div class="text-content">
				<v-icon v-if="icon" :name="icon" />
				<div>
					<p v-if="title" class="title">
						<render-template :collection="collection" :fields="fields" :item="values" :template="title" />
					</p>
					<p v-if="subtitle" class="subtitle">
						<render-template :collection="collection" :fields="fields" :item="values" :template="subtitle" />
					</p>
				</div>
			</div>


			<div class="actions">
				


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
					small 
					@click="handleSwitchBU"
				>
					{{currentBusinessUnitName}}
					<v-icon name="swap_horiz" right />
				</v-button>

				<template v-if="!hasMultipleActions && primaryAction">
					
					<v-button
						:type="primaryAction.type"
						small
						@click="handleActionClick(primaryAction)"

					>
						{{ primaryAction.label }}
						<v-icon v-if="primaryAction.icon" :name="primaryAction.icon" right />
					</v-button>

				</template>






				<v-menu v-if="hasMultipleActions" placement="bottom-end">
					<template #activator="{ toggle }">
						<v-button small @click="toggle">
							{{ props.actionButton }}
							<v-icon name="expand_more" right />
						</v-button>
					</template>



					<v-list>

						<v-list-item
							v-for="(action, index) in actionList"
							:key="index"
							clickable
							@click="handleActionClick(action)"
						>
							<v-list-item-icon v-if="action.icon">
								<v-icon :name="action.icon" />
							</v-list-item-icon>
							<v-list-item-content>
								<v-list-item-title>

										{{ action.label }}

								</v-list-item-title>
							</v-list-item-content>
						</v-list-item>


					</v-list>
				</v-menu>

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

.text-content {
	display: flex;

	.v-icon {
		margin-right: 4px;
		transform: translateY(-1px);
	}
}

.title {
	font-size: 20px;
	font-weight: 600;
}

.subtitle {
	font-size: 14px;
	color: var(--theme--foreground-subdued);
	margin-top: 4px;
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
