import React, { useState } from 'react';
import {
  Create,
  SimpleForm,
  TextInput,
  SelectInput,
  NumberInput,
  ArrayInput,
  SimpleFormIterator,
  ReferenceInput,
  AutocompleteInput,
  BooleanInput,
  FormDataConsumer,
  useNotify,
  useRedirect,
  useDataProvider,
  Toolbar,
  SaveButton,
} from 'react-admin';
import { Box, Typography } from '@mui/material';

const paymentChoices = [
  { id: 'cash_on_delivery', name: 'Ramburs' },
  { id: 'bank_transfer', name: 'Transfer Bancar' },
  { id: 'card', name: 'Card (EuPlătesc)' },
  { id: 'smartbill_online', name: 'SmartBill Online' },
  { id: 'smartbill_transfer', name: 'SmartBill Transfer' },
];

const ManualOrderToolbar = ({ saving }) => (
  <Toolbar>
    <SaveButton label="Creează comanda" saving={saving} />
  </Toolbar>
);

const OrderCreate = () => {
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const redirect = useRedirect();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (values) => {
    try {
      setSaving(true);
      const payload = {
        ...values,
        shippingCost: values.shippingCost !== undefined ? Number(values.shippingCost) : undefined,
        items: (values.items || []).map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity || 1),
        })),
      };

      if (payload.billingSameAsShipping) {
        payload.billingAddress = { ...payload.shippingAddress, sameAsShipping: true };
      } else if (payload.billingAddress) {
        payload.billingAddress.sameAsShipping = false;
      }

      delete payload.billingSameAsShipping;

      const { data } = await dataProvider.create('orders', { data: payload });
      notify('Comanda a fost creată', { type: 'success' });

      if (data?.id) {
        redirect(`/orders/${data.id}/show`);
      } else {
        redirect('/orders');
      }
    } catch (error) {
      console.error(error);
      notify(error.message || 'Nu am putut crea comanda', { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Create title="Creare comandă manuală">
      <SimpleForm onSubmit={handleSubmit} toolbar={<ManualOrderToolbar saving={saving} />}>
        <Typography variant="h6" gutterBottom>
          Detalii client
        </Typography>
        <SelectInput
          source="customerType"
          label="Tip client"
          choices={[
            { id: 'guest', name: 'Client fără cont' },
            { id: 'existing', name: 'Client existent' },
          ]}
          defaultValue="guest"
          fullWidth
        />

        <FormDataConsumer>
          {({ formData, ...rest }) =>
            formData.customerType === 'existing' ? (
              <ReferenceInput
                source="userId"
                reference="users"
                perPage={25}
                filterToQuery={(searchText) => ({ search: searchText })}
                {...rest}
              >
                <AutocompleteInput
                  label="Client"
                  optionText={(record) => `${record?.name || ''} – ${record?.email || ''}`}
                  optionValue="id"
                  fullWidth
                />
              </ReferenceInput>
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: { sm: '1fr 1fr' }, gap: 2 }}>
                <TextInput source="guestName" label="Nume complet" fullWidth required {...rest} />
                <TextInput source="guestPhone" label="Telefon" fullWidth required {...rest} />
                <TextInput source="guestEmail" label="Email" type="email" fullWidth required {...rest} />
              </Box>
            )
          }
        </FormDataConsumer>

        <Box mt={3}>
          <Typography variant="h6" gutterBottom>
            Produse
          </Typography>
          <ArrayInput source="items">
            <SimpleFormIterator inline disableClear disableReordering>
              <ReferenceInput
                source="productId"
                reference="products"
                perPage={25}
                filterToQuery={(searchText) => ({ search: searchText })}
              >
                <AutocompleteInput
                  label="Produs"
                  optionText={(record) => `${record?.name || ''}`}
                  optionValue="id"
                  fullWidth
                />
              </ReferenceInput>
              <NumberInput source="quantity" label="Cantitate" min={1} defaultValue={1} />
            </SimpleFormIterator>
          </ArrayInput>
        </Box>

        <Box mt={3}>
          <Typography variant="h6" gutterBottom>
            Adresă de livrare
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { sm: '1fr 1fr' }, gap: 2 }}>
            <TextInput source="shippingAddress.firstName" label="Prenume" required />
            <TextInput source="shippingAddress.lastName" label="Nume" required />
            <TextInput source="shippingAddress.street" label="Stradă" required />
            <TextInput source="shippingAddress.city" label="Oraș" required />
            <TextInput source="shippingAddress.county" label="Județ" required />
            <TextInput source="shippingAddress.postalCode" label="Cod poștal" required />
            <TextInput source="shippingAddress.country" label="Țară" defaultValue="România" />
            <TextInput source="shippingAddress.phone" label="Telefon" />
          </Box>
        </Box>

        <Box mt={3}>
          <Typography variant="h6" gutterBottom>
            Adresă de facturare
          </Typography>
          <BooleanInput source="billingSameAsShipping" label="Folosește aceeași adresă" defaultValue />
          <FormDataConsumer>
            {({ formData }) =>
              formData.billingSameAsShipping ? null : (
                <Box sx={{ display: 'grid', gridTemplateColumns: { sm: '1fr 1fr' }, gap: 2 }}>
                  <TextInput source="billingAddress.street" label="Stradă" />
                  <TextInput source="billingAddress.city" label="Oraș" />
                  <TextInput source="billingAddress.county" label="Județ" />
                  <TextInput source="billingAddress.postalCode" label="Cod poștal" />
                  <TextInput source="billingAddress.country" label="Țară" defaultValue="România" />
                </Box>
              )
            }
          </FormDataConsumer>
        </Box>

        <Box mt={3}>
          <Typography variant="h6" gutterBottom>
            Detalii plată
          </Typography>
          <SelectInput source="paymentMethod" label="Metodă de plată" choices={paymentChoices} defaultValue="cash_on_delivery" />
          <NumberInput source="shippingCost" label="Cost livrare (RON)" helperText="Lasă gol pentru calcul automat" />
          <BooleanInput source="generateInvoice" label="Generează factură SmartBill" />
          <TextInput source="notes" label="Notițe" multiline fullWidth />
        </Box>
      </SimpleForm>
    </Create>
  );
};

export default OrderCreate;
