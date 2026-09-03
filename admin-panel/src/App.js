import React from 'react';
import { Admin, Resource, EditGuesser, ShowGuesser } from 'react-admin';
import { ThemeProvider } from '@mui/material/styles';
import polyglotI18nProvider from 'ra-i18n-polyglot';
import dataProvider from './dataProvider';
import authProvider from './authProvider';
import pilotOnTheme from './theme';
import romanianMessages from './romanianMessages';

// Import custom components
import { ProductList } from './components/ProductList';
import { ProductShow } from './components/ProductShow';
import { ProductEdit } from './components/ProductEdit';
import { ProductCreate } from './components/ProductCreate';
import { OrderList } from './components/OrderList';
import { OrderShow } from './components/OrderShow';
import OrderCreate from './components/OrderCreate';
import { UserList } from './components/UserList';
import { ReviewList } from './components/ReviewList';
import { ReviewShow } from './components/ReviewShow';
import B2BApplicationList from './components/B2BApplicationList';
import B2BApplicationShow from './components/B2BApplicationShow';
import ContactMessageList from './components/ContactMessageList';
import ContactMessageShow from './components/ContactMessageShow';
import { PriceList } from './components/PriceList';
import Dashboard from './components/Dashboard';
import CustomLayout from './components/Layout';
import LoginPage from './components/LoginPage';

const i18nProvider = polyglotI18nProvider(() => romanianMessages, 'ro');

function App() {
  return (
    <ThemeProvider theme={pilotOnTheme}>
      <Admin
        dataProvider={dataProvider}
        authProvider={authProvider}
        i18nProvider={i18nProvider}
        title="PilotOn Admin"
        dashboard={Dashboard}
        layout={CustomLayout}
        loginPage={LoginPage}
        theme={pilotOnTheme}
      >
      <Resource 
        name="products" 
        list={ProductList} 
        edit={ProductEdit} 
        show={ProductShow}
        create={ProductCreate}
      />
      <Resource
        name="preturi"
        list={PriceList}
      />
      <Resource
        name="orders"
        list={OrderList} 
        edit={EditGuesser} 
        show={OrderShow}
        create={OrderCreate}
      />
      <Resource
        name="users"
        list={UserList}
        edit={EditGuesser}
        show={ShowGuesser}
      />
      <Resource
        name="reviews"
        list={ReviewList}
        show={ReviewShow}
      />
      <Resource
        name="b2b-applications"
        list={B2BApplicationList}
        show={B2BApplicationShow}
        options={{ label: 'Cereri B2B' }}
      />
      <Resource
        name="contact-messages"
        list={ContactMessageList}
        show={ContactMessageShow}
        options={{ label: 'Mesaje Contact' }}
      />
      </Admin>
    </ThemeProvider>
  );
}

export default App;
