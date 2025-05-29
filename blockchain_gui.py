import tkinter as tk
from tkinter import ttk, messagebox
import requests

API_BASE_URL = "http://localhost:8000"
LOGIN_ENDPOINT = f"{API_BASE_URL}/api/token/"
HISTORY_ENDPOINT = f"{API_BASE_URL}/esc/api/history/{{case_id}}"

class BlockchainGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("ESC Blockchain Viewer")
        self.token = None

        # Login frame
        login_frame = tk.Frame(root)
        login_frame.pack(padx=10, pady=10, fill=tk.X)

        tk.Label(login_frame, text="Username:").grid(row=0, column=0, sticky="w")
        self.username_entry = tk.Entry(login_frame)
        self.username_entry.grid(row=0, column=1, sticky="we")

        tk.Label(login_frame, text="Password:").grid(row=1, column=0, sticky="w")
        self.password_entry = tk.Entry(login_frame, show="*")
        self.password_entry.grid(row=1, column=1, sticky="we")

        self.login_button = tk.Button(login_frame, text="Login", command=self.login)
        self.login_button.grid(row=2, column=0, columnspan=2, pady=5)

        login_frame.columnconfigure(1, weight=1)

        # Case selection
        case_frame = tk.Frame(root)
        case_frame.pack(padx=10, pady=10, fill=tk.X)

        tk.Label(case_frame, text="Case ID:").grid(row=0, column=0, sticky="w")
        self.case_entry = tk.Entry(case_frame)
        self.case_entry.grid(row=0, column=1, sticky="we")

        self.load_button = tk.Button(case_frame, text="Load History", command=self.load_history, state="disabled")
        self.load_button.grid(row=0, column=2, padx=5)

        case_frame.columnconfigure(1, weight=1)

        # History table
        self.tree = ttk.Treeview(root, columns=("id", "operation", "user", "evidence", "date"), show='headings')
        for col, title in zip(self.tree["columns"], ["ID", "Operation", "User", "Evidence", "Date"]):
            self.tree.heading(col, text=title)
        self.tree.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

    def login(self):
        data = {
            "username": self.username_entry.get(),
            "password": self.password_entry.get(),
        }
        try:
            response = requests.post(LOGIN_ENDPOINT, data=data)
            response.raise_for_status()
            self.token = response.json().get("access")
            if not self.token:
                raise ValueError("No access token received")
            messagebox.showinfo("Login", "Login successful")
            self.load_button.config(state="normal")
        except Exception as e:
            messagebox.showerror("Login", f"Login failed: {e}")

    def load_history(self):
        if not self.token:
            messagebox.showwarning("Warning", "Please login first")
            return
        case_id = self.case_entry.get().strip()
        if not case_id:
            messagebox.showwarning("Warning", "Please enter a case ID")
            return
        url = HISTORY_ENDPOINT.format(case_id=case_id)
        headers = {"Authorization": f"Bearer {self.token}"}
        try:
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            records = response.json()
            for row in self.tree.get_children():
                self.tree.delete(row)
            for rec in records:
                self.tree.insert("", "end", values=(rec["id"], rec["operation_desc"], rec["user"], rec["evidence_file"], rec["date"]))
        except Exception as e:
            messagebox.showerror("Error", f"Failed to load history: {e}")

if __name__ == "__main__":
    root = tk.Tk()
    gui = BlockchainGUI(root)
    root.mainloop()
