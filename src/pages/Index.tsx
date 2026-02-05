import { Navigate } from "react-router-dom";

const Index = () => {
  // Since this route is protected, we redirect the authenticated user to the main budget view.
  return <Navigate to="/budget" replace />;
};

export default Index;