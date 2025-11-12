import sys
import csv
import pandas as pd
import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages

def main(csv_path, pdf_path):
    df = pd.read_csv(csv_path)
    df = df[df.columns[:6]]
    real = df[df['mode'] == 'real']
    sim = df[df['mode'] == 'sim']
    with PdfPages(pdf_path) as pdf:
        fig, ax = plt.subplots(figsize=(8,4))
        ax.plot(real['time_s'], real['battery_level'], label='Real')
        ax.plot(sim['time_s'], sim['battery_level'], label='Sim')
        ax.set_title('Battery Level')
        ax.set_xlabel('Time (s)')
        ax.set_ylabel('%')
        ax.legend()
        pdf.savefig(fig); plt.close(fig)

        fig, ax = plt.subplots(figsize=(8,4))
        ax.plot(real['time_s'], real['rx_bytes']+real['tx_bytes'], label='Real')
        ax.plot(sim['time_s'], sim['rx_bytes']+sim['tx_bytes'], label='Sim')
        ax.set_title('Network Bytes')
        ax.set_xlabel('Time (s)')
        ax.set_ylabel('Bytes')
        ax.legend()
        pdf.savefig(fig); plt.close(fig)

        fig, ax = plt.subplots(figsize=(8,4))
        ax.plot(real['time_s'], real['cpu_percent'], label='Real')
        ax.plot(sim['time_s'], sim['cpu_percent'], label='Sim')
        ax.set_title('CPU Load')
        ax.set_xlabel('Time (s)')
        ax.set_ylabel('%')
        ax.legend()
        pdf.savefig(fig); plt.close(fig)

if __name__ == '__main__':
    csv_path = sys.argv[1] if len(sys.argv) > 1 else 'docs/metrics.csv'
    pdf_path = sys.argv[2] if len(sys.argv) > 2 else 'docs/report.pdf'
    main(csv_path, pdf_path)
