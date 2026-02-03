import xlsxwriter
from datetime import date

def create_colorful_pastel_tracker():
    filename = 'Premium_Colorful_Bookkeeping_2026.xlsx'
    workbook = xlsxwriter.Workbook(filename)
    
    # --- Expanded Pastel Color Palette ---
    colors = {
        'mint': '#E8F8F5',      # Monthly Tab / Income Data
        'rose': '#FDEDEC',      # Tax Tab / Expense Data
        'sky': '#EBF5FB',       # Transactions Tab / Table Headers
        'lavender': '#F5EEF8',  # Setup Tab
        'gold': '#FEF9E7',      # Yearly Tab
        'text': '#2E4053',      # Dark grey text for contrast
        'white': '#FFFFFF'
    }

    # --- Global Cell Formats ---
    # Base settings for the big title boxes
    base_title = {
        'bold': True, 'font_size': 24, 'font_color': colors['text'], 
        'border': 2, 'border_color': colors['text'],
        'align': 'center', 'valign': 'vcenter'
    }
    
    # Specific Title Formats (Colorful Boxes)
    setup_title_fmt = workbook.add_format(dict(base_title, bg_color=colors['lavender']))
    trans_title_fmt = workbook.add_format(dict(base_title, bg_color=colors['sky']))
    tax_title_fmt = workbook.add_format(dict(base_title, bg_color=colors['rose']))
    month_title_fmt = workbook.add_format(dict(base_title, bg_color=colors['mint']))
    year_title_fmt = workbook.add_format(dict(base_title, bg_color=colors['gold']))

    # Standard formats
    header_fmt = workbook.add_format({'bold': True, 'bg_color': colors['sky'], 'border': 1, 'align': 'center', 'font_color': colors['text']})
    label_fmt = workbook.add_format({'bold': True, 'bg_color': '#F8F9F9', 'border': 1, 'font_color': colors['text']})
    curr_fmt = workbook.add_format({'num_format': '#,##0.00', 'border': 1})
    date_fmt = workbook.add_format({'num_format': 'yyyy-mm-dd', 'border': 1})
    pct_fmt = workbook.add_format({'num_format': '0.00%', 'border': 1, 'align': 'center'})

    # ==========================================
    # 1. SETUP TAB (Theme: Lavender)
    # ==========================================
    setup = workbook.add_worksheet('Setup')
    setup.hide_gridlines(2)
    setup.set_column('B:C', 25); setup.set_column('D:K', 20)
    
    # Colorful Header Box
    setup.merge_range('B2:K4', 'SYSTEM SETUP & LISTS', setup_title_fmt)
    
    setup.write('B6', 'Currency Symbol', label_fmt); setup.write('C6', '$', curr_fmt)
    setup.write('B7', 'Fiscal Year Start Month', label_fmt); setup.write('C7', 1, curr_fmt)
    setup.write('B8', 'Tax Rate (Editable)', label_fmt); setup.write('C8', 0.15, pct_fmt)

    # Dynamic Lists
    lists = {
        'E': ('Income Categories', ['Consulting', 'Sales', 'Royalties', 'Subsidies'] + [f'Income Cat {i}' for i in range(5, 45)]),
        'G': ('Expense Categories', ['Rent', 'Software', 'Travel', 'Marketing'] + [f'Expense Cat {i}' for i in range(5, 45)]),
        'I': ('Clients/Customers', ['Global Corp', 'Local Shop', 'Online Sales', 'Walk-in']),
        'J': ('Vendors/Suppliers', ['Amazon', 'Landlord', 'Utility Co', 'Software Ltd']),
        'K': ('Payment Methods', ['Credit Card', 'Cash', 'Bank Transfer', 'Stripe'])
    }
    for col, (title, items) in lists.items():
        setup.write(f'{col}6', title, header_fmt)
        setup.write_column(f'{col}7', items)

    # ==========================================
    # 2. TRANSACTIONS TAB (Theme: Sky Blue)
    # ==========================================
    trans = workbook.add_worksheet('Transactions')
    trans.set_column('A:L', 18)
    
    # Colorful Header Box
    trans.merge_range('A1:C3', 'TRANSACTION LOG', trans_title_fmt)
    
    t_headers = ['Date', 'Type', 'Category', 'Client/Customer', 'Vendor/Supplier', 'Payment Method', 'Account/Bank', 'Description', 'Reference', 'Amount', 'Taxable?', 'Tax Amount']
    trans.add_table('A5:L1000', {'columns': [{'header': h} for h in t_headers], 'style': 'Table Style Light 11'})
    
    # Data Validation
    trans.data_validation('B6:B1000', {'validate': 'list', 'source': ['Income', 'Expense']})
    trans.data_validation('C6:C1000', {'validate': 'list', 'source': '=Setup!$E$7:$E$50'})
    trans.data_validation('K6:K1000', {'validate': 'list', 'source': ['Yes', 'No']})

    # Sample Data (Q1)
    s_data = [
        [date(2026, 1, 5),  'Income',  'Consulting',    'Global Corp',  '-',            'Transfer', 'Business', 'Project Phase 1', 'INV-01', 8000, 'Yes'],
        [date(2026, 1, 15), 'Expense', 'Rent',          '-',            'Landlord',     'Transfer', 'Business', 'Office Rent',    'R-01',  2000, 'No'],
        [date(2026, 2, 10), 'Income',  'Sales',         'Online Sales', '-',            'Stripe',   'Business', 'Bulk Order',      'INV-02', 4500, 'Yes'],
        [date(2026, 2, 20), 'Expense', 'Marketing',     '-',            'Software Ltd', 'Card',     'Business', 'Social Ads',      'ADS-99', 1200, 'Yes'],
        [date(2026, 3, 5),  'Income',  'Royalties',     'Online Sales', '-',            'Transfer', 'Business', 'Q1 Payout',       'ROY-01', 3000, 'Yes'],
        [date(2026, 3, 12), 'Expense', 'Software',      '-',            'Amazon',       'Card',     'Business', 'Server Fees',     'AMZ-01', 400,  'Yes'],
    ]
    for i, row in enumerate(s_data, start=5):
        trans.write_datetime(i, 0, row[0], date_fmt)
        trans.write_row(i, 1, row[1:11])
        trans.write_formula(i, 11, f'=IF(K{i+1}="Yes", J{i+1}*Setup!$C$8, 0)', curr_fmt)

    # ==========================================
    # 3. TAX DETAILS TAB (Theme: Rose Pink)
    # ==========================================
    tax_sh = workbook.add_worksheet('Tax Details')
    tax_sh.set_column('B:C', 30)
    
    # Colorful Header Box
    tax_sh.merge_range('B2:C4', 'VAT / SALES TAX SUMMARY', tax_title_fmt)
    
    tax_sh.write('B6', 'Tax Collected (Income)', label_fmt)
    tax_sh.write_formula('C6', '=SUMIFS(Transactions!$L$6:$L$1000, Transactions!$B$6:$B$1000, "Income")', curr_fmt)
    tax_sh.write('B7', 'Tax Paid (Expenses)', label_fmt)
    tax_sh.write_formula('C7', '=SUMIFS(Transactions!$L$6:$L$1000, Transactions!$B$6:$B$1000, "Expense")', curr_fmt)
    tax_sh.write('B9', 'NET TAX POSITION', header_fmt)
    tax_sh.write_formula('C9', '=C6-C7', curr_fmt)

    # ==========================================
    # 4. MONTHLY SUMMARY (Theme: Mint Green)
    # ==========================================
    month_sh = workbook.add_worksheet('Monthly Summary')
    month_sh.set_column('A:M', 15)
    
    # Colorful Header Box
    month_sh.merge_range('A1:C3', 'MONTHLY REPORT', month_title_fmt)
    
    # --- Colorful Chart at Top ---
    m_chart = workbook.add_chart({'type': 'column'})
    m_chart.add_series({
        'name': 'Income', 'categories': "='Monthly Summary'!$B$21:$M$21", 'values': "='Monthly Summary'!$B$22:$M$22", 
        'fill': {'color': '#AED6F1'}, 'border': {'color': '#AED6F1'} # Slightly deeper pastel for bars
    })
    m_chart.add_series({
        'name': 'Expenses', 'categories': "='Monthly Summary'!$B$21:$M$21", 'values': "='Monthly Summary'!$B$23:$M$23", 
        'fill': {'color': '#F5B7B1'}, 'border': {'color': '#F5B7B1'} # Slightly deeper pastel for bars
    })
    m_chart.set_title({'name': 'Monthly Performance Overview'})
    # Set Chart Area Background to Pastel Mint
    m_chart.set_chartarea({'fill': {'color': colors['mint']}})
    # Set Plot Area Background to White so bars pop
    m_chart.set_plotarea({'fill': {'color': colors['white']}})
    month_sh.insert_chart('E1', m_chart, {'x_scale': 1.6, 'y_scale': 0.9})

    # Data Table Below
    months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    month_sh.write_row('B21', months, header_fmt)
    month_sh.write('A22', 'Income', label_fmt); month_sh.write('A23', 'Expenses', label_fmt); month_sh.write('A24', 'Net Profit', header_fmt)

    for i in range(1, 13):
        col = chr(65 + i)
        month_sh.write_formula(21, i, f'=SUMPRODUCT((MONTH(Transactions!$A$6:$A$1000)={i})*(Transactions!$B$6:$B$1000="Income")*(Transactions!$J$6:$J$1000))', curr_fmt)
        month_sh.write_formula(22, i, f'=SUMPRODUCT((MONTH(Transactions!$A$6:$A$1000)={i})*(Transactions!$B$6:$B$1000="Expense")*(Transactions!$J$6:$J$1000))', curr_fmt)
        month_sh.write_formula(23, i, f'={col}22-{col}23', curr_fmt)

    # ==========================================
    # 5. YEARLY SUMMARY (Theme: Gold/Peach)
    # ==========================================
    year_sh = workbook.add_worksheet('Yearly Summary')
    year_sh.hide_gridlines(2)
    year_sh.set_column('B:E', 22)
    
    # Colorful Header Box
    year_sh.merge_range('B2:E4', 'ANNUAL DASHBOARD', year_title_fmt)

    # --- Colorful Pie Chart at Top ---
    pie = workbook.add_chart({'type': 'pie'})
    pie.add_series({
        'name': 'Annual Split', 'categories': "='Yearly Summary'!$B$16:$B$17", 'values': "='Yearly Summary'!$C$16:$C$17",
        'points': [{'fill': {'color': '#AED6F1'}}, {'fill': {'color': '#F5B7B1'}}],
        'data_labels': {'value': True, 'percentage': True, 'separator': '\n', 'position': 'inside_end'}
    })
    pie.set_title({'name': 'Income vs Expense Ratio'})
    # Set Chart Area Background to Pastel Gold
    pie.set_chartarea({'fill': {'color': colors['gold']}})
    pie.set_plotarea({'fill': {'color': colors['white']}})
    year_sh.insert_chart('B6', pie, {'x_scale': 1.1, 'y_scale': 1.1})

    # Summary Stats below chart
    year_sh.write('B16', 'Total Revenue', label_fmt); year_sh.write_formula('C16', "=SUM('Monthly Summary'!$B$22:$M$22)", curr_fmt)
    year_sh.write('B17', 'Total Expenses', label_fmt); year_sh.write_formula('C17', "=SUM('Monthly Summary'!$B$23:$M$23)", curr_fmt)
    year_sh.write('B19', 'NET YEARLY PROFIT', header_fmt); year_sh.write_formula('C19', "=C16-C17", curr_fmt)

    workbook.close()
    print(f"Successfully created colorful pastel tracker: {filename}")

if __name__ == '__main__':
    create_colorful_pastel_tracker()