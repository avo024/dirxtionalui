

## Three Changes: Create Patient Page + Edit Patient + Remove Documents Tab

### Part 1: Standalone "Add New Patient" page

**New file: `src/pages/clinic/CreatePatient.tsx`**

Card-based form with sections:
- **Required**: Full Name
- **Demographics**: DOB (date picker), Gender (dropdown), Phone, Alternate Phone, Email
- **Address**: Street, City + State (side by side), Zip
- **Medical**: Height, Weight, Allergies (textarea)
- **Guardian (optional)**: Authorized Representative, Representative Phone

On submit: call `clinicApi.createPatient(data)`, success toast + navigate to `/clinic/patients`, error toast on failure.

**`src/App.tsx`**: Add route `patients/new` before `patients/:id` inside the clinic layout.

**`src/pages/clinic/PatientsList.tsx`**: Change both "Add New Patient" links from `/clinic/referrals/new` to `/clinic/patients/new`.

### Part 2: Inline edit on Patient Detail

**`src/pages/clinic/PatientDetail.tsx`**:
- Add `isEditing` state and `editData` state object
- Add "Edit" button top-right of Patient Information tab; toggles to "Save" + "Cancel" in edit mode
- In edit mode, replace `InfoField` displays with `Input`/`Select`/`Textarea` fields bound to `editData`
- On Save: call `clinicApi.updatePatient(id, editData)`, success toast, refresh patient data, exit edit mode
- On Cancel: discard changes, exit edit mode

**`src/lib/api.ts`**: Add `updatePatient` to `clinicApi`:
```ts
async updatePatient(id: string, data: any): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/patients/${id}`, {
    method: 'PUT', headers: getHeaders(), body: JSON.stringify(data),
  });
  return handleResponse(response);
},
```

### Part 3: Remove Documents tab

**`src/pages/clinic/PatientDetail.tsx`**:
- Remove `TabsTrigger value="documents"` (line 159)
- Remove entire `TabsContent value="documents"` block (lines 424-465)
- Remove `allDocuments` variable (line 107)
- Remove unused `Eye`, `Download` icon imports

### No other files affected

