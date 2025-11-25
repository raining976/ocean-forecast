<template>
    <div class="formContainer">
        <section>
            <template v-for="(field, index) in fields" :key="index">
                <!-- Date Range -->
                <b-field v-if="field.type === 'date-range'" :label="field.label" horizontal class="datepickerBox"
                    :type="field.error ? 'is-danger' : ''" :message="field.error">
                    <b-datepicker v-model="form[field.key]" :placeholder="field.placeholder || '点击选择...'" range
                        style="width: 230px;" size="is-small" v-bind="field.props"
                        @range-end="(val) => $emit('range-end', val)"
                        @range-start="(val) => $emit('range-start', val)">
                    </b-datepicker>
                    <b-tooltip v-if="field.tooltip" style="margin: 0 10px; line-height: 30px;" :label="field.tooltip"
                        position="is-right" type="is-dark"><vue-fontawesome icon="circle-exclamation" /></b-tooltip>
                </b-field>

                <!-- Number Input -->
                <b-field v-else-if="field.type === 'number'" :label="field.label" horizontal>
                    <b-numberinput size="is-small" type="is-dark" v-model.number="form[field.key]" v-bind="field.props"
                        style="width: 230px; height: 30px;"></b-numberinput>
                    <span v-if="field.unit" style="font-weight: bold; line-height: 30px;">{{ field.unit }}</span>
                </b-field>

                <!-- Radio Group -->
                <b-field v-else-if="field.type === 'radio'" :label="field.label" horizontal class="gradType">
                    <b-radio v-for="opt in field.options" :key="opt.value" v-model="form[field.key]" :name="field.key"
                        :native-value="opt.value" type="is-black">
                        {{ opt.label }}
                    </b-radio>
                </b-field>

                <!-- Image Selector -->
                <b-field v-else-if="field.type === 'image-selector'" :label="field.label" horizontal>
                    <image-selector :image-url="field.props?.imageUrl"
                        @selection-string="(val) => $emit('selection-change', val)" />
                </b-field>

                <!-- Select -->
                <b-field v-else-if="field.type === 'select'" :label="field.label" horizontal>
                    <b-select v-model="form[field.key]" :placeholder="field.placeholder || '选择一个变量'" size="is-small">
                        <option v-for="(option, idx) in field.options" :value="option.value" :key="idx">
                            {{ option.label }}
                        </option>
                    </b-select>
                </b-field>
            </template>

            <slot name="extra-fields"></slot>

            <b-field horizontal><b-button type="is-dark" size="is-small" style="margin: 10px 0;"
                    @click="submitForm">提交分析</b-button></b-field>
        </section>
    </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
    modelValue: {
        type: Object,
        required: true,
        default: () => ({})
    },
    fields: {
        type: Array,
        required: true,
        default: () => []
    }
})

const emit = defineEmits(['update:modelValue', 'submit', 'range-start', 'range-end', 'selection-change'])

const form = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
})

const submitForm = () => emit('submit')
</script>

<style scoped lang="scss">
$container-height: 680px;

.modelInterpreterContainer {
    display: flex;
    justify-content: center;
    align-items: center;
    height: $container-height;

    .formContainer {
        min-width: 500px;
        border-radius: 10px;
        margin: 0px 10px;
        padding: 20px 30px;
        height: calc($container-height - 40px);
        background-color: var(--bulma-scheme-main);

        &:deep(.field.is-horizontal) {
            margin-bottom: 8px;
        }

        &:deep(.field-label) {
            margin-right: 8px;
            padding-top: 0px;
        }

        &:deep(.icon.has-text-danger) {
            width: 18px;
            margin-right: 5px;
        }

        .gradType:deep(.field-body .field) {
            width: 80px;
            flex-grow: 0;
        }

        &:deep(.field .has-numberinput.has-numberinput-is-small) {
            flex-grow: 0;
        }

        &:deep(.datepickerBox .field:first-child) {
            flex-grow: 0;
            margin: 0;
        }

    }

    .resultWrapper {
        width: 400px;
        height: calc($container-height - 40px);
        margin: 0px 10px;
    }
}
</style>