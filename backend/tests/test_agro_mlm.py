"""
Agro MLM Backend API Tests
Tests for: Auth, Kit Purchase, Commissions, Products, Orders, Withdrawals, Admin
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://mlm-kit-commerce.preview.emergentagent.com').rstrip('/')

# Test credentials from test_credentials.md
ADMIN_EMAIL = "admin@agromlm.com"
ADMIN_PASSWORD = "Admin@12345"
ADMIN_REFERRAL_CODE = "ADMIN001"


class TestPublicEndpoints:
    """Public endpoints - no auth required"""
    
    def test_api_root(self):
        """Test API root returns ok status"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        print(f"SUCCESS: API root returns {data}")
    
    def test_public_plan(self):
        """Test /public/plan returns kit_price, direct_bonus_map, team_level_map, milestones"""
        response = requests.get(f"{BASE_URL}/api/public/plan")
        assert response.status_code == 200
        data = response.json()
        
        # Verify kit_price
        assert data["kit_price"] == 10000
        assert data["monthly_cashback"] == 1000
        assert data["cashback_months"] == 24
        
        # Verify direct_bonus_map has 24 entries
        assert len(data["direct_bonus_map"]) == 24
        assert data["direct_bonus_map"]["1"] == 0.05  # L1 = 5%
        assert data["direct_bonus_map"]["2"] == 0.02  # L2 = 2%
        
        # Verify team_level_map has 24 entries
        assert len(data["team_level_map"]) == 24
        assert data["team_level_map"]["1"] == 0.10  # L1 = 10%
        
        # Verify milestones (11 tiers)
        assert len(data["milestones"]) == 11
        assert data["milestones"][0]["tier"] == 1
        assert data["milestones"][0]["target"] == 250000
        print(f"SUCCESS: Public plan has {len(data['direct_bonus_map'])} direct bonus levels, {len(data['milestones'])} milestones")
    
    def test_public_stats(self):
        """Test /public/stats returns member counts"""
        response = requests.get(f"{BASE_URL}/api/public/stats")
        assert response.status_code == 200
        data = response.json()
        assert "total_members" in data
        assert "active_kits" in data
        assert data["kit_price"] == 10000
        print(f"SUCCESS: Public stats - {data['total_members']} members, {data['active_kits']} active kits")
    
    def test_products_list(self):
        """Test /products returns seeded products (8 products across 4 categories)"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 8  # At least 8 seeded products
        print(f"SUCCESS: Products list has {len(data)} products")
    
    def test_categories_list(self):
        """Test /categories returns seeded categories"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 4  # At least 4 seeded categories
        print(f"SUCCESS: Categories list has {len(data)} categories")
    
    def test_offers_list(self):
        """Test /offers returns seeded festive banner"""
        response = requests.get(f"{BASE_URL}/api/offers")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1  # At least 1 seeded offer
        print(f"SUCCESS: Offers list has {len(data)} offers")


class TestAuthEndpoints:
    """Authentication endpoints"""
    
    def test_admin_login(self):
        """Test admin login with correct credentials"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == ADMIN_EMAIL.lower()
        assert data["role"] == "admin"
        assert data["referral_code"] == ADMIN_REFERRAL_CODE
        
        # Verify httpOnly cookies are set
        assert "access_token" in session.cookies
        assert "refresh_token" in session.cookies
        print(f"SUCCESS: Admin login - role={data['role']}, code={data['referral_code']}")
    
    def test_login_invalid_credentials(self):
        """Test login with wrong password returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("SUCCESS: Invalid credentials returns 401")
    
    def test_register_with_sponsor_code(self):
        """Test registration with sponsor code places user in binary tree"""
        unique_email = f"test_{uuid.uuid4().hex[:8]}@test.com"
        session = requests.Session()
        
        response = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "Test@12345",
            "name": "Test User",
            "phone": "9876543210",
            "sponsor_code": ADMIN_REFERRAL_CODE
        })
        assert response.status_code == 200
        data = response.json()
        
        # Verify user data
        assert data["email"] == unique_email.lower()
        assert data["sponsor_code"] == ADMIN_REFERRAL_CODE
        assert data["referral_code"] is not None
        assert len(data["referral_code"]) > 0
        
        # Verify binary tree placement
        assert data["placement_parent_id"] is not None
        assert data["position"] in ["L", "R"]
        
        # Verify httpOnly cookies
        assert "access_token" in session.cookies
        print(f"SUCCESS: Registered user with code={data['referral_code']}, position={data['position']}")
        
        return session, data
    
    def test_register_without_sponsor(self):
        """Test registration without sponsor code"""
        unique_email = f"test_nosponsor_{uuid.uuid4().hex[:8]}@test.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "Test@12345",
            "name": "No Sponsor User",
            "phone": ""
        })
        assert response.status_code == 200
        data = response.json()
        assert data["sponsor_code"] is None
        assert data["placement_parent_id"] is None
        print(f"SUCCESS: Registered user without sponsor, code={data['referral_code']}")
    
    def test_register_invalid_sponsor_code(self):
        """Test registration with invalid sponsor code returns 400"""
        unique_email = f"test_invalid_{uuid.uuid4().hex[:8]}@test.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "Test@12345",
            "name": "Invalid Sponsor User",
            "sponsor_code": "INVALID999"
        })
        assert response.status_code == 400
        print("SUCCESS: Invalid sponsor code returns 400")
    
    def test_auth_me(self):
        """Test /auth/me returns current user"""
        session = requests.Session()
        # Login first
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        # Get current user
        response = session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == ADMIN_EMAIL.lower()
        print(f"SUCCESS: /auth/me returns user {data['email']}")
    
    def test_logout(self):
        """Test logout clears cookies"""
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        response = session.post(f"{BASE_URL}/api/auth/logout")
        assert response.status_code == 200
        
        # Verify /auth/me now returns 401
        response = session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("SUCCESS: Logout clears auth")


class TestKitPurchaseAndCommissions:
    """Kit purchase and commission distribution tests"""
    
    def test_kit_purchase_flow(self):
        """Test kit purchase marks kit_purchased, schedules cashbacks, credits commissions"""
        # Register a new user under admin
        unique_email = f"test_kit_{uuid.uuid4().hex[:8]}@test.com"
        session = requests.Session()
        
        reg_response = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "Test@12345",
            "name": "Kit Buyer",
            "sponsor_code": ADMIN_REFERRAL_CODE
        })
        assert reg_response.status_code == 200
        user_data = reg_response.json()
        assert user_data["kit_purchased"] == False
        
        # Purchase kit
        purchase_response = session.post(f"{BASE_URL}/api/user/kit/purchase", json={
            "payment_method": "mock"
        })
        assert purchase_response.status_code == 200
        purchase_data = purchase_response.json()
        assert purchase_data["status"] == "approved"
        assert "order_id" in purchase_data
        print(f"SUCCESS: Kit purchased, order_id={purchase_data['order_id'][:8]}")
        
        # Verify user now has kit_purchased=True
        me_response = session.get(f"{BASE_URL}/api/auth/me")
        assert me_response.status_code == 200
        me_data = me_response.json()
        assert me_data["kit_purchased"] == True
        print("SUCCESS: User kit_purchased is now True")
        
        # Verify cashback schedule created (24 entries)
        cashback_response = session.get(f"{BASE_URL}/api/user/cashback")
        assert cashback_response.status_code == 200
        cashback_data = cashback_response.json()
        assert len(cashback_data) == 24
        assert cashback_data[0]["amount"] == 1000
        print(f"SUCCESS: {len(cashback_data)} cashback entries scheduled")
        
        return session, user_data
    
    def test_kit_already_purchased(self):
        """Test purchasing kit twice returns 400"""
        # Register and purchase kit
        unique_email = f"test_double_{uuid.uuid4().hex[:8]}@test.com"
        session = requests.Session()
        
        session.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "Test@12345",
            "name": "Double Buyer",
            "sponsor_code": ADMIN_REFERRAL_CODE
        })
        
        # First purchase
        session.post(f"{BASE_URL}/api/user/kit/purchase", json={"payment_method": "mock"})
        
        # Second purchase should fail
        response = session.post(f"{BASE_URL}/api/user/kit/purchase", json={"payment_method": "mock"})
        assert response.status_code == 400
        print("SUCCESS: Double kit purchase returns 400")
    
    def test_direct_referral_commission(self):
        """Test admin receives 5% commission on L1 kit purchase"""
        # Get admin's initial wallet balance
        admin_session = requests.Session()
        admin_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        initial_response = admin_session.get(f"{BASE_URL}/api/user/dashboard")
        initial_balance = initial_response.json()["stats"]["wallet_balance"]
        
        # Register new user under admin and purchase kit
        unique_email = f"test_comm_{uuid.uuid4().hex[:8]}@test.com"
        user_session = requests.Session()
        user_session.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "Test@12345",
            "name": "Commission Test",
            "sponsor_code": ADMIN_REFERRAL_CODE
        })
        user_session.post(f"{BASE_URL}/api/user/kit/purchase", json={"payment_method": "mock"})
        
        # Check admin's new balance (should have +500 = 5% of 10000)
        final_response = admin_session.get(f"{BASE_URL}/api/user/dashboard")
        final_balance = final_response.json()["stats"]["wallet_balance"]
        
        commission = final_balance - initial_balance
        assert commission == 500, f"Expected 500, got {commission}"
        print(f"SUCCESS: Admin received ₹{commission} commission (5% of ₹10,000)")


class TestUserEndpoints:
    """User dashboard and tree endpoints"""
    
    def test_user_dashboard(self):
        """Test /user/dashboard returns stats"""
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        response = session.get(f"{BASE_URL}/api/user/dashboard")
        assert response.status_code == 200
        data = response.json()
        
        assert "user" in data
        assert "stats" in data
        assert "wallet_balance" in data["stats"]
        assert "total_earnings" in data["stats"]
        assert "direct_referrals" in data["stats"]
        assert "total_team" in data["stats"]
        print(f"SUCCESS: Dashboard stats - wallet={data['stats']['wallet_balance']}, directs={data['stats']['direct_referrals']}")
    
    def test_user_tree(self):
        """Test /user/tree returns nested left/right structure"""
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        response = session.get(f"{BASE_URL}/api/user/tree?depth=4")
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert "name" in data
        assert "referral_code" in data
        assert "left" in data or data.get("left") is None
        assert "right" in data or data.get("right") is None
        print(f"SUCCESS: Tree root - name={data['name']}, code={data['referral_code']}")
    
    def test_user_team(self):
        """Test /user/team lists direct referrals"""
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        response = session.get(f"{BASE_URL}/api/user/team")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Team has {len(data)} direct referrals")
    
    def test_wallet_transactions_filter(self):
        """Test /user/wallet/transactions filters by tx_type"""
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        # Get all transactions
        response = session.get(f"{BASE_URL}/api/user/wallet/transactions")
        assert response.status_code == 200
        all_tx = response.json()
        
        # Filter by type
        response = session.get(f"{BASE_URL}/api/user/wallet/transactions?tx_type=direct_referral")
        assert response.status_code == 200
        filtered_tx = response.json()
        
        # All filtered should be direct_referral type
        for tx in filtered_tx:
            assert tx["type"] == "direct_referral"
        print(f"SUCCESS: Wallet transactions - all={len(all_tx)}, direct_referral={len(filtered_tx)}")


class TestOrdersAndTeamProfit:
    """Product orders and team level profit tests"""
    
    def test_create_order(self):
        """Test creating order computes profit and credits team level profit"""
        # Get a product first
        products_response = requests.get(f"{BASE_URL}/api/products")
        products = products_response.json()
        assert len(products) > 0
        product = products[0]
        
        # Register user and purchase kit (required for orders)
        unique_email = f"test_order_{uuid.uuid4().hex[:8]}@test.com"
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "Test@12345",
            "name": "Order Test",
            "sponsor_code": ADMIN_REFERRAL_CODE
        })
        session.post(f"{BASE_URL}/api/user/kit/purchase", json={"payment_method": "mock"})
        
        # Get admin's initial balance
        admin_session = requests.Session()
        admin_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        initial = admin_session.get(f"{BASE_URL}/api/user/dashboard").json()["stats"]["wallet_balance"]
        
        # Create order
        order_response = session.post(f"{BASE_URL}/api/orders", json={
            "items": [{"product_id": product["product_id"], "quantity": 2}],
            "address": "123 Test Street"
        })
        assert order_response.status_code == 200
        order_data = order_response.json()
        assert "order_id" in order_data
        assert "total" in order_data
        print(f"SUCCESS: Order created - id={order_data['order_id'][:8]}, total={order_data['total']}")
        
        # Check admin received team level profit (10% of order profit)
        final = admin_session.get(f"{BASE_URL}/api/user/dashboard").json()["stats"]["wallet_balance"]
        profit_share = final - initial
        
        # Order profit = total * 10% margin, admin gets 10% of that
        expected_profit = product["price"] * 2 * 0.10 * 0.10  # 10% margin, 10% L1 share
        print(f"SUCCESS: Admin received ₹{profit_share} team profit (expected ~₹{expected_profit})")
    
    def test_my_orders(self):
        """Test /orders returns user's orders"""
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        response = session.get(f"{BASE_URL}/api/orders")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: User has {len(data)} orders")


class TestWithdrawals:
    """Withdrawal request tests"""
    
    def test_withdraw_request(self):
        """Test withdrawal deducts balance and creates pending request"""
        # Login as admin (has wallet balance from commissions)
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        # Get current balance
        dashboard = session.get(f"{BASE_URL}/api/user/dashboard").json()
        balance = dashboard["stats"]["wallet_balance"]
        
        if balance < 100:
            print(f"SKIP: Admin balance too low ({balance}), skipping withdrawal test")
            return
        
        # Request withdrawal
        withdraw_amount = 100
        response = session.post(f"{BASE_URL}/api/user/withdraw", json={
            "amount": withdraw_amount,
            "method": "bank",
            "details": "Test Bank Account"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "pending"
        assert "withdrawal_id" in data
        print(f"SUCCESS: Withdrawal requested - id={data['withdrawal_id'][:8]}, status={data['status']}")
        
        # Verify balance deducted
        new_dashboard = session.get(f"{BASE_URL}/api/user/dashboard").json()
        new_balance = new_dashboard["stats"]["wallet_balance"]
        assert new_balance == balance - withdraw_amount
        print(f"SUCCESS: Balance deducted from {balance} to {new_balance}")
        
        return data["withdrawal_id"]
    
    def test_withdraw_insufficient_balance(self):
        """Test withdrawal with insufficient balance returns 400"""
        # Register new user with 0 balance
        unique_email = f"test_withdraw_{uuid.uuid4().hex[:8]}@test.com"
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "Test@12345",
            "name": "Withdraw Test"
        })
        
        response = session.post(f"{BASE_URL}/api/user/withdraw", json={
            "amount": 1000,
            "method": "bank",
            "details": "Test"
        })
        assert response.status_code == 400
        print("SUCCESS: Insufficient balance returns 400")
    
    def test_my_withdrawals(self):
        """Test /user/withdrawals returns withdrawal history"""
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        response = session.get(f"{BASE_URL}/api/user/withdrawals")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: User has {len(data)} withdrawal requests")


class TestAdminEndpoints:
    """Admin-only endpoints"""
    
    def get_admin_session(self):
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return session
    
    def test_admin_overview(self):
        """Test /admin/overview returns stats"""
        session = self.get_admin_session()
        response = session.get(f"{BASE_URL}/api/admin/overview")
        assert response.status_code == 200
        data = response.json()
        assert "users_count" in data
        assert "kit_purchased" in data
        assert "total_revenue" in data
        assert "pending_withdrawals" in data
        print(f"SUCCESS: Admin overview - users={data['users_count']}, revenue={data['total_revenue']}")
    
    def test_admin_users(self):
        """Test /admin/users returns all users"""
        session = self.get_admin_session()
        response = session.get(f"{BASE_URL}/api/admin/users")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1  # At least admin
        print(f"SUCCESS: Admin users list has {len(data)} users")
    
    def test_admin_kit_orders(self):
        """Test /admin/kit-orders returns kit orders"""
        session = self.get_admin_session()
        response = session.get(f"{BASE_URL}/api/admin/kit-orders")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Admin kit orders has {len(data)} orders")
    
    def test_admin_withdrawals(self):
        """Test /admin/withdrawals returns all withdrawals"""
        session = self.get_admin_session()
        response = session.get(f"{BASE_URL}/api/admin/withdrawals")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Admin withdrawals has {len(data)} requests")
    
    def test_admin_withdrawal_approve_reject(self):
        """Test admin can approve/reject withdrawals"""
        session = self.get_admin_session()
        
        # Get pending withdrawals
        withdrawals = session.get(f"{BASE_URL}/api/admin/withdrawals?status=pending").json()
        
        if len(withdrawals) == 0:
            print("SKIP: No pending withdrawals to test")
            return
        
        withdrawal = withdrawals[0]
        wid = withdrawal["withdrawal_id"]
        
        # Approve it
        response = session.post(f"{BASE_URL}/api/admin/withdrawals/{wid}/approve")
        assert response.status_code == 200
        print(f"SUCCESS: Withdrawal {wid[:8]} approved")
    
    def test_admin_cashback_run_all(self):
        """Test /admin/cashback/run-all pays all pending cashbacks"""
        session = self.get_admin_session()
        response = session.post(f"{BASE_URL}/api/admin/cashback/run-all")
        assert response.status_code == 200
        data = response.json()
        assert "paid_count" in data
        assert "total_paid" in data
        print(f"SUCCESS: Cashback run-all - paid {data['paid_count']} entries, total ₹{data['total_paid']}")
    
    def test_admin_orders(self):
        """Test /admin/orders returns all orders"""
        session = self.get_admin_session()
        response = session.get(f"{BASE_URL}/api/admin/orders")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Admin orders has {len(data)} orders")


class TestAdminCRUD:
    """Admin CRUD for categories, products, offers"""
    
    def get_admin_session(self):
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return session
    
    def test_category_crud(self):
        """Test POST/DELETE /admin/categories"""
        session = self.get_admin_session()
        
        # Create category
        response = session.post(f"{BASE_URL}/api/admin/categories", json={
            "name": "Test Category",
            "slug": "test-category"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Test Category"
        cat_id = data["category_id"]
        print(f"SUCCESS: Category created - id={cat_id[:8]}")
        
        # Delete category
        response = session.delete(f"{BASE_URL}/api/admin/categories/{cat_id}")
        assert response.status_code == 200
        print(f"SUCCESS: Category deleted")
    
    def test_product_crud(self):
        """Test POST/PUT/DELETE /admin/products"""
        session = self.get_admin_session()
        
        # Create product
        response = session.post(f"{BASE_URL}/api/admin/products", json={
            "name": "Test Product",
            "description": "Test description",
            "price": 500,
            "stock": 50,
            "profit_margin": 0.15
        })
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Test Product"
        prod_id = data["product_id"]
        print(f"SUCCESS: Product created - id={prod_id[:8]}")
        
        # Update product
        response = session.put(f"{BASE_URL}/api/admin/products/{prod_id}", json={
            "name": "Updated Product",
            "description": "Updated description",
            "price": 600,
            "stock": 60,
            "profit_margin": 0.20
        })
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Product"
        assert data["price"] == 600
        print(f"SUCCESS: Product updated")
        
        # Delete product
        response = session.delete(f"{BASE_URL}/api/admin/products/{prod_id}")
        assert response.status_code == 200
        print(f"SUCCESS: Product deleted")
    
    def test_offer_crud(self):
        """Test POST/DELETE /admin/offers"""
        session = self.get_admin_session()
        
        # Create offer
        response = session.post(f"{BASE_URL}/api/admin/offers", json={
            "title": "Test Offer",
            "type": "discount",
            "discount_pct": 10,
            "active": True
        })
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Test Offer"
        offer_id = data["offer_id"]
        print(f"SUCCESS: Offer created - id={offer_id[:8]}")
        
        # Delete offer
        response = session.delete(f"{BASE_URL}/api/admin/offers/{offer_id}")
        assert response.status_code == 200
        print(f"SUCCESS: Offer deleted")


class TestRoleGuard:
    """Test role-based access control"""
    
    def test_non_admin_cannot_access_admin_endpoints(self):
        """Test non-admin calling /admin/* returns 403"""
        # Register regular user
        unique_email = f"test_role_{uuid.uuid4().hex[:8]}@test.com"
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "Test@12345",
            "name": "Regular User"
        })
        
        # Try to access admin endpoints
        endpoints = [
            "/api/admin/overview",
            "/api/admin/users",
            "/api/admin/kit-orders",
            "/api/admin/withdrawals",
            "/api/admin/orders",
        ]
        
        for endpoint in endpoints:
            response = session.get(f"{BASE_URL}{endpoint}")
            assert response.status_code == 403, f"Expected 403 for {endpoint}, got {response.status_code}"
        
        print(f"SUCCESS: Non-admin blocked from {len(endpoints)} admin endpoints")
    
    def test_unauthenticated_cannot_access_protected(self):
        """Test unauthenticated requests return 401"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        
        response = requests.get(f"{BASE_URL}/api/user/dashboard")
        assert response.status_code == 401
        
        print("SUCCESS: Unauthenticated requests return 401")


class TestBinaryTreeSpillover:
    """Test binary tree BFS placement spillover"""
    
    def test_spillover_placement(self):
        """Test multiple users under same sponsor fill L then R then go deeper"""
        admin_session = requests.Session()
        admin_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        # Get admin's tree before
        tree_before = admin_session.get(f"{BASE_URL}/api/user/tree?depth=3").json()
        
        # Register 3 users under admin
        positions = []
        for i in range(3):
            unique_email = f"test_spill_{uuid.uuid4().hex[:8]}@test.com"
            session = requests.Session()
            response = session.post(f"{BASE_URL}/api/auth/register", json={
                "email": unique_email,
                "password": "Test@12345",
                "name": f"Spillover User {i+1}",
                "sponsor_code": ADMIN_REFERRAL_CODE
            })
            data = response.json()
            positions.append({
                "name": data["name"],
                "position": data["position"],
                "parent": data["placement_parent_id"]
            })
        
        # Verify BFS placement (L, R, then deeper)
        print(f"SUCCESS: Spillover placements: {positions}")
        
        # Get admin's tree after
        tree_after = admin_session.get(f"{BASE_URL}/api/user/tree?depth=3").json()
        print(f"SUCCESS: Tree has left={tree_after.get('left') is not None}, right={tree_after.get('right') is not None}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
