

## Fix File Upload Validation

Two files, four types of changes each. All lines verified.

### `src/pages/clinic/CreateReferral.tsx`

1. **Line 141**: Add `"image/tiff"` to `validTypes` array
2. **Line 143**: Update toast to `"Please upload PDF, JPG, PNG, or TIFF"`
3. **After line 144** (after the type-check block): Add 10 MB size check
4. **Lines 619–621**: Change all three `accept` attributes to `".pdf,.jpg,.jpeg,.png,.tiff,.tif"`

### `src/components/PAManagementCard.tsx`

1. **Line 125**: Add `"image/tiff"` to `validTypes` array
2. **Line 127**: Update toast to `"Please upload a PDF, JPG, PNG, or TIFF file."`
3. **After line 128** (after the type-check block): Add 10 MB size check
4. **Line 442**: Change `accept` to `".pdf,.jpg,.jpeg,.png,.tiff,.tif"`

### Size check block (identical in both files)
```ts
if (file.size > 10 * 1024 * 1024) {
  toast({ title: "File too large", description: "Maximum file size is 10 MB", variant: "destructive" });
  return;
}
```

