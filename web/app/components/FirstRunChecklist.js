import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  Text, 
  Stack, 
  Checkbox, 
  Button,
  ProgressBar,
  Banner,
  Link
} from '@shopify/polaris';

const CHECKLIST_ITEMS = [
  {
    id: 'app_installed',
    title: 'App Installation Complete',
    description: 'The Shopify Bulk Buddy app is installed and authenticated',
    automatic: true
  },
  {
    id: 'first_products_loaded',
    title: 'Products Loaded Successfully',
    description: 'Your store\'s product variants have been loaded into the interface',
    automatic: true
  },
  {
    id: 'understand_bulk_editing',
    title: 'Understanding Bulk Operations',
    description: 'Learn how bulk editing works and what can be modified',
    manual: true,
    helpText: 'Bulk editing allows you to modify multiple product variants at once. You can change prices, inventory, SKUs, weights, and more. Always preview changes before applying them.'
  },
  {
    id: 'test_small_batch',
    title: 'Test with Small Batch',
    description: 'Try editing just a few variants first to get familiar with the process',
    manual: true,
    helpText: 'Start by selecting 2-3 variants, make small changes, and use the preview feature. This helps you understand the workflow before making larger changes.'
  },
  {
    id: 'backup_understanding',
    title: 'Backup and Safety Awareness',
    description: 'Understand that changes cannot be automatically undone',
    manual: true,
    helpText: 'Bulk Buddy cannot automatically reverse changes. Consider exporting your data first, or keep a backup of important pricing information.'
  },
  {
    id: 'csv_import_familiar',
    title: 'CSV Import/Export (Optional)',
    description: 'Learn how to import and export data via CSV files',
    manual: true,
    helpText: 'CSV import allows you to make complex changes in spreadsheet software. Export your current data first to see the expected format.'
  },
  {
    id: 'filters_and_search',
    title: 'Filters and Search',
    description: 'Use filters to find specific products quickly',
    manual: true,
    helpText: 'Use the search filters to narrow down to specific products. You can filter by title, SKU, price range, and inventory levels.'
  }
];

export default function FirstRunChecklist({ 
  isOpen, 
  onClose, 
  onComplete,
  shopData 
}) {
  const [completedItems, setCompletedItems] = useState(new Set());
  const [autoCompleteChecked, setAutoCompleteChecked] = useState(false);

  useEffect(() => {
    // Auto-complete certain items based on app state
    const autoComplete = new Set();
    
    // App is installed if we have shop data
    if (shopData) {
      autoComplete.add('app_installed');
    }
    
    // Products loaded if we're showing the checklist (implies products were fetched)
    if (isOpen) {
      autoComplete.add('first_products_loaded');
    }
    
    setCompletedItems(autoComplete);
    setAutoCompleteChecked(true);
  }, [shopData, isOpen]);

  const handleItemToggle = (itemId) => {
    const item = CHECKLIST_ITEMS.find(i => i.id === itemId);
    if (item && item.automatic) return; // Can't manually toggle automatic items
    
    setCompletedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleComplete = () => {
    // Mark checklist as completed in localStorage
    localStorage.setItem('bulk-buddy-onboarding-complete', 'true');
    localStorage.setItem('bulk-buddy-onboarding-date', new Date().toISOString());
    
    if (onComplete) {
      onComplete();
    }
    onClose();
  };

  const totalItems = CHECKLIST_ITEMS.length;
  const completedCount = completedItems.size;
  const progress = (completedCount / totalItems) * 100;
  const isComplete = completedCount === totalItems;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Welcome to Shopify Bulk Buddy!"
      primaryAction={{
        content: isComplete ? 'Get Started' : 'Complete Later',
        onAction: handleComplete
      }}
      secondaryActions={!isComplete ? [{
        content: 'Skip Setup',
        onAction: onClose
      }] : []}
      large
    >
      <Modal.Section>
        <Stack vertical spacing="loose">
          <Text variant="bodyMd">
            Let's get you set up for success with bulk variant editing. 
            Complete these steps to ensure you're ready to safely manage your products.
          </Text>

          <div>
            <Text variant="headingMd">Progress: {completedCount}/{totalItems}</Text>
            <div style={{ marginTop: '8px' }}>
              <ProgressBar progress={progress} />
            </div>
          </div>

          {isComplete && (
            <Banner status="success">
              <Text variant="bodyMd">
                🎉 You're all set! You can now start using Bulk Buddy to efficiently manage your product variants.
              </Text>
            </Banner>
          )}

          <Stack vertical spacing="loose">
            {CHECKLIST_ITEMS.map((item) => {
              const isCompleted = completedItems.has(item.id);
              const isDisabled = item.automatic && !isCompleted;
              
              return (
                <div 
                  key={item.id}
                  style={{
                    padding: '16px',
                    border: '1px solid #e1e3e5',
                    borderRadius: '8px',
                    backgroundColor: isCompleted ? '#f7f9fa' : '#ffffff'
                  }}
                >
                  <Stack alignment="leading" spacing="tight">
                    <Checkbox
                      checked={isCompleted}
                      onChange={() => handleItemToggle(item.id)}
                      disabled={item.automatic}
                      label=""
                    />
                    <Stack vertical spacing="extraTight">
                      <div>
                        <Text variant="bodyMd" fontWeight={isCompleted ? "semibold" : "regular"}>
                          {item.title}
                          {item.automatic && (
                            <Text variant="bodySm" color="subdued"> (automatic)</Text>
                          )}
                        </Text>
                      </div>
                      <Text variant="bodySm" color="subdued">
                        {item.description}
                      </Text>
                      {item.helpText && (
                        <div style={{ 
                          marginTop: '8px', 
                          padding: '8px', 
                          backgroundColor: '#f6f6f7',
                          borderRadius: '4px' 
                        }}>
                          <Text variant="bodySm">
                            💡 {item.helpText}
                          </Text>
                        </div>
                      )}
                    </Stack>
                  </Stack>
                </div>
              );
            })}
          </Stack>

          <Banner>
            <Stack vertical spacing="tight">
              <Text variant="bodyMd" fontWeight="semibold">
                Need Help?
              </Text>
              <Text variant="bodySm">
                • Check the documentation banner at the top of the app for quick tips
              </Text>
              <Text variant="bodySm">
                • Use the preview feature before applying any bulk changes
              </Text>
              <Text variant="bodySm">
                • Start with small batches when learning the interface
              </Text>
              <Text variant="bodySm">
                • Contact support if you encounter any issues
              </Text>
            </Stack>
          </Banner>
        </Stack>
      </Modal.Section>
    </Modal>
  );
}
