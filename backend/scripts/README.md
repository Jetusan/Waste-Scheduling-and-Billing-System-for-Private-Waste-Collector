# Admin Account Creation Scripts

This folder contains scripts to create admin accounts for the WSBS (Waste Scheduling and Billing System) admin dashboard.

## Available Scripts

### 1. **quickCreateAdmin.js** ⭐ (Recommended)
Fast and simple admin account creation with command-line arguments or defaults.

#### Usage:

**Option A: Use default credentials**
```bash
node scripts/quickCreateAdmin.js
```
This creates an admin account with:
- Username: `admin`
- Password: `admin123`
- Name: Admin User

**Option B: Provide custom credentials**
```bash
node scripts/quickCreateAdmin.js <username> <password> <firstName> <lastName>
```

**Examples:**
```bash
# Create admin with username 'superadmin'
node scripts/quickCreateAdmin.js superadmin SecurePass123 John Doe

# Create admin with middle name and contact
node scripts/quickCreateAdmin.js admin admin123 Jane M Smith 09123456789
```

---

### 2. **createAdmin.js** (Interactive)
Interactive script that prompts you for each field.

#### Usage:
```bash
node scripts/createAdmin.js
```

You'll be prompted to enter:
- Username (required)
- Password (required)
- First Name (required)
- Middle Name (optional)
- Last Name (required)
- Contact Number (optional)

---

## Prerequisites

1. **Database must be running** - Ensure PostgreSQL is running and the database is set up
2. **Environment variables** - Make sure your `.env` file is configured with database credentials
3. **Dependencies installed** - Run `npm install` in the backend folder

## What These Scripts Do

1. ✅ Hash the password securely using bcrypt
2. ✅ Create entry in `user_names` table
3. ✅ Assign admin role from `roles` table
4. ✅ Create or use default address
5. ✅ Create user account in `users` table with admin role
6. ✅ Verify username doesn't already exist

## After Creating Admin Account

Once the admin account is created, you can:

1. **Login to Admin Dashboard:**
   - URL: `http://localhost:3000/login`
   - Use the username and password you created

2. **Access Admin Features:**
   - Dashboard with metrics and analytics
   - User management
   - Collection schedule management
   - Billing and invoicing
   - Reports and insights
   - System settings

## Troubleshooting

### Error: "Admin role not found in database"
**Solution:** Ensure the `roles` table has an entry with `role_name = 'admin'`

```sql
INSERT INTO roles (role_name, description) 
VALUES ('admin', 'Administrator with full system access');
```

### Error: "Default city not found"
**Solution:** Ensure the `cities` table has "General Santos City"

```sql
INSERT INTO cities (city_name) 
VALUES ('General Santos City');
```

### Error: "Username already exists"
**Solution:** Choose a different username or delete the existing user if needed

### Error: "Database connection error"
**Solution:** Check your `.env` file and ensure PostgreSQL is running

---

## Security Notes

⚠️ **Important Security Reminders:**

1. **Change default password** - If using default credentials, change the password immediately after first login
2. **Use strong passwords** - For production, always use strong, unique passwords
3. **Protect credentials** - Never commit passwords or credentials to version control
4. **Limit admin accounts** - Only create admin accounts for authorized personnel

---

## Script Customization

To change default credentials in `quickCreateAdmin.js`, edit the `DEFAULT_ADMIN` object:

```javascript
const DEFAULT_ADMIN = {
  username: 'admin',
  password: 'admin123',  // Change this
  firstName: 'Admin',
  middleName: null,
  lastName: 'User',
  contactNumber: '09123456789'
};
```

---

## Need Help?

If you encounter any issues:
1. Check the error message in the terminal
2. Verify database connection and schema
3. Ensure all required tables exist (users, user_names, roles, addresses, cities, barangays)
4. Check the backend logs for more details
