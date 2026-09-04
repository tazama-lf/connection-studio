// Status constants used across features
export const ENDPOINT_STATUS = {
  IN_PROGRESS: 'In-Progress',
  READY_FOR_APPROVAL: 'Ready for Approval',
  SUSPENDED: 'Suspended',
  CLONED: 'Cloned',
} as const;

export type EndpointStatus =
  (typeof ENDPOINT_STATUS)[keyof typeof ENDPOINT_STATUS];

// Workflow status
export const WORKFLOW_STATUS = {
  ACTIVE: 'active',
  PAUSED: 'in-active',
} as const;

export type WorkflowStatus =
  (typeof WORKFLOW_STATUS)[keyof typeof WORKFLOW_STATUS];

// Configuration types
export const CONFIGURATION_TYPE = {
  PULL: 'pull',
  PUSH: 'push',
} as const;

export type ConfigurationType =
  (typeof CONFIGURATION_TYPE)[keyof typeof CONFIGURATION_TYPE];

// Source types for data enrichment
export const SOURCE_TYPE = {
  SFTP: 'sftp',
  HTTP: 'http',
} as const;

export type SourceType = (typeof SOURCE_TYPE)[keyof typeof SOURCE_TYPE];

// File formats
export const FILE_FORMAT = {
  CSV: 'csv',
  JSON: 'json',
  XML: 'xml',
} as const;

export type FileFormat = (typeof FILE_FORMAT)[keyof typeof FILE_FORMAT];

// Transaction types
export const TRANSACTION_TYPE = {
  TRANSFERS: 'transfers',
  PAYMENTS: 'payments',
} as const;

export type TransactionType =
  (typeof TRANSACTION_TYPE)[keyof typeof TRANSACTION_TYPE];

export const sampleJsonPayload = `{
  "FIToFIPmtSts": {
    "GrpHdr": {
      "MsgId": "msg_id",
      "CreDtTm": "2023-02-03T09:53:58.069Z"
    },
    "TxInfAndSts": {
      "OrgnlInstrId": "5d158d92f70142a6ac7ffba30ac6c2db",
      "OrgnlEndToEndId": "End_To_End_Id",
      "TxSts": "ACCC",
      "ChrgsInf": [
        {
          "Amt": {
            "Amt": 3000.07,
            "Ccy": "USD"
          },
          "Agt": {
            "FinInstnId": {
              "ClrSysMmbId": {
                "MmbId": "typolog028"
              }
            }
          }
        },
        {
          "Amt": {
            "Amt": 153.57,
            "Ccy": "USD"
          },
          "Agt": {
            "FinInstnId": {
              "ClrSysMmbId": {
                "MmbId": "typolog028"
              }
            }
          }
        },
        {
          "Amt": {
            "Amt": 35,
            "Ccy": "USD"
          },
          "Agt": {
            "FinInstnId": {
              "ClrSysMmbId": {
                "MmbId": "dfsp002"
              }
            }
          }
        }
      ],
      "AccptncDtTm": "2023-02-03T09:53:58.069Z",
      "InstgAgt": {
        "FinInstnId": {
          "ClrSysMmbId": {
            "MmbId": "typolog028"
          }
        }
      },
      "InstdAgt": {
        "FinInstnId": {
          "ClrSysMmbId": {
            "MmbId": "dfsp002"
          }
        }
      }
    }
  }
}`;
export const sampleXmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.11">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>TXN12345</MsgId>
      <CreDtTm>2023-10-15T10:30:00</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <InstrId>INSTR001</InstrId>
        <EndToEndId>E2E001</EndToEndId>
      </PmtId>
      <IntrBkSttlmAmt Ccy="USD">100.00</IntrBkSttlmAmt>
      <Dbtr>
        <Nm>John Doe</Nm>
        <Id>
          <PrvtId>CUST123</PrvtId>
        </Id>
      </Dbtr>
      <Cdtr>
        <Nm>Jane Smith</Nm>
        <Id>
          <PrvtId>CUST456</PrvtId>
        </Id>
      </Cdtr>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`;
