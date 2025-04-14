import React, { useState, useEffect } from 'react';
import { FormField, FormItem, FormControl } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { XCircleIcon, PlusCircleIcon, PlusIcon, LucideFilter } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import { AvailableFields, Condition, FieldMapping, LogicOperator } from '@shared/redzone-types';

interface ConditionGroupProps {
  form: UseFormReturn<any>;
  groupIndex: number;
  availableFields?: AvailableFields;
  onAddCondition: (groupIndex: number) => void;
  onRemoveCondition: (groupIndex: number, conditionIndex: number) => void;
  onLogicOperatorChange: (groupIndex: number, operator: LogicOperator) => void;
  onRemoveGroup: (groupIndex: number) => void;
}

export const ConditionGroup: React.FC<ConditionGroupProps> = ({
  form, 
  groupIndex, 
  availableFields, 
  onAddCondition,
  onRemoveCondition,
  onLogicOperatorChange,
  onRemoveGroup
}) => {
  const [fieldOptions, setFieldOptions] = useState<FieldMapping[]>([]);
  const [operators, setOperators] = useState<{ value: string, label: string }[]>([]);
  const logicOperator = form.watch(`conditions.groups.${groupIndex}.logicOperator`);
  const conditions = form.watch(`conditions.groups.${groupIndex}.conditions`) || [];

  // Combine all available fields into a flat list for selection
  useEffect(() => {
    if (availableFields) {
      const allFields: FieldMapping[] = [
        ...(availableFields.customer || []),
        ...(availableFields.customer_metrics || []),
        ...(availableFields.subscription || []),
        ...(availableFields.invoice || []),
        ...(availableFields.company || [])
      ];
      setFieldOptions(allFields);
    }
  }, [availableFields]);

  // Set up operators based on field types
  useEffect(() => {
    const defaultOperators = [
      { value: 'equals', label: 'Equals' },
      { value: 'not_equals', label: 'Not Equals' },
      { value: 'contains', label: 'Contains' },
      { value: 'starts_with', label: 'Starts With' },
      { value: 'ends_with', label: 'Ends With' },
      { value: 'is_empty', label: 'Is Empty' },
      { value: 'is_not_empty', label: 'Is Not Empty' }
    ];
    
    const numericOperators = [
      { value: 'equals', label: 'Equals' },
      { value: 'not_equals', label: 'Not Equals' },
      { value: 'greater_than', label: 'Greater Than' },
      { value: 'less_than', label: 'Less Than' },
      { value: 'in_range', label: 'In Range' }
    ];
    
    setOperators(defaultOperators);
  }, []);

  // Get field label for display
  const getFieldLabel = (fieldPath: string): string => {
    const field = fieldOptions.find(f => f.path === fieldPath);
    return field ? field.label : fieldPath;
  };

  // Get appropriate operators based on field type
  const getOperatorsForField = (fieldPath: string) => {
    const field = fieldOptions.find(f => f.path === fieldPath);
    if (!field) return operators;
    
    if (field.fieldType === 'number') {
      return [
        { value: 'equals', label: 'Equals' },
        { value: 'not_equals', label: 'Not Equals' },
        { value: 'greater_than', label: 'Greater Than' },
        { value: 'less_than', label: 'Less Than' },
        { value: 'in_range', label: 'In Range' }
      ];
    } else if (field.fieldType === 'date') {
      return [
        { value: 'equals', label: 'Equals' },
        { value: 'not_equals', label: 'Not Equals' },
        { value: 'greater_than', label: 'After' },
        { value: 'less_than', label: 'Before' },
        { value: 'in_range', label: 'Between' }
      ];
    } else if (field.fieldType === 'boolean') {
      return [
        { value: 'equals', label: 'Equals' },
        { value: 'not_equals', label: 'Not Equals' }
      ];
    }
    
    return operators;
  };

  return (
    <Card className="mb-4 border-2">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <FormField
              control={form.control}
              name={`conditions.groups.${groupIndex}.logicOperator`}
              render={({ field }) => (
                <FormItem className="w-24">
                  <Select 
                    value={field.value} 
                    onValueChange={(value) => {
                      field.onChange(value);
                      onLogicOperatorChange(groupIndex, value as LogicOperator);
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="AND">AND</SelectItem>
                      <SelectItem value="OR">OR</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <span className="mx-2 text-sm font-medium">between conditions</span>
          </div>
          
          {groupIndex > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onRemoveGroup(groupIndex)}
              className="h-8 px-2 text-destructive"
            >
              <XCircleIcon className="h-4 w-4 mr-1" />
              Remove Group
            </Button>
          )}
        </div>
        
        {conditions.map((condition: Condition, conditionIndex: number) => (
          <div key={conditionIndex} className="flex items-center gap-2 mb-2">
            <FormField
              control={form.control}
              name={`conditions.groups.${groupIndex}.conditions.${conditionIndex}.field`}
              render={({ field }) => (
                <FormItem className="flex-1">
                  <Select 
                    value={field.value} 
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[300px]">
                      <SelectItem value="">Select a field</SelectItem>
                      
                      {availableFields?.customer && availableFields.customer.length > 0 && (
                        <>
                          <SelectItem value="" disabled className="font-semibold">
                            Customer Fields
                          </SelectItem>
                          {availableFields.customer.map(field => (
                            <SelectItem key={field.id} value={field.path}>
                              {field.label}
                            </SelectItem>
                          ))}
                        </>
                      )}
                      
                      {availableFields?.company && availableFields.company.length > 0 && (
                        <>
                          <SelectItem value="" disabled className="font-semibold">
                            Company Fields
                          </SelectItem>
                          {availableFields.company.map(field => (
                            <SelectItem key={field.id} value={field.path}>
                              {field.label}
                            </SelectItem>
                          ))}
                        </>
                      )}
                      
                      {availableFields?.customer_metrics && availableFields.customer_metrics.length > 0 && (
                        <>
                          <SelectItem value="" disabled className="font-semibold">
                            Metrics Fields
                          </SelectItem>
                          {availableFields.customer_metrics.map(field => (
                            <SelectItem key={field.id} value={field.path}>
                              {field.label}
                            </SelectItem>
                          ))}
                        </>
                      )}
                      
                      {availableFields?.subscription && availableFields.subscription.length > 0 && (
                        <>
                          <SelectItem value="" disabled className="font-semibold">
                            Subscription Fields
                          </SelectItem>
                          {availableFields.subscription.map(field => (
                            <SelectItem key={field.id} value={field.path}>
                              {field.label}
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name={`conditions.groups.${groupIndex}.conditions.${conditionIndex}.operator`}
              render={({ field }) => (
                <FormItem className="w-32">
                  <Select 
                    value={field.value} 
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {getOperatorsForField(form.watch(`conditions.groups.${groupIndex}.conditions.${conditionIndex}.field`)).map(op => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name={`conditions.groups.${groupIndex}.conditions.${conditionIndex}.value`}
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input placeholder="Value" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onRemoveCondition(groupIndex, conditionIndex)}
              disabled={conditions.length <= 1}
              className={conditions.length <= 1 ? 'opacity-50 cursor-not-allowed' : ''}
            >
              <XCircleIcon className="h-5 w-5 text-red-500" />
            </Button>
          </div>
        ))}
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onAddCondition(groupIndex)}
          className="mt-2"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Condition
        </Button>
      </CardContent>
    </Card>
  );
};

export default ConditionGroup;