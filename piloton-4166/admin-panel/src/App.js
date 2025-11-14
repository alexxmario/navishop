import React from 'react';
import { Admin, Resource, EditGuesser, ShowGuesser } from 'react-admin';
import { ThemeProvider } from '@mui/material/styles';
import dataProvider from './dataProvider';
import authProvider from './authProvider';
import pilotOnTheme from './theme';

// Import custom components
import { ProductList } from './components/ProductList';
import { ProductShow } from './components/ProductShow';
import { ProductEdit } from './components/ProductEdit';
import { ProductCreate } from './components/ProductCreate';
import { OrderList } from './components/OrderList';
import { OrderShow } from './components/OrderShow';
import { UserList } from './components/UserList';
import { ReviewList } from './components/ReviewList';
import { ReviewShow } from './components/ReviewShow';
import Dashboard from './components/Dashboard';
import CustomLayout from './components/Layout';
import LoginPage from './components/LoginPage';

function App() {
  return (
    <ThemeProvider theme={pilotOnTheme}>
      <Admin 
        dataProvider={dataProvider} 
        authProvider={authProvider}
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
        name="orders" 
        list={OrderList} 
        edit={EditGuesser} 
        show={OrderShow}
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
      </Admin>
    </ThemeProvider>
  );
}

export default App;