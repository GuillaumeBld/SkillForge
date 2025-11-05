import {
  Box,
  Checkbox,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from "@mui/material";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import NoteAddIcon from "@mui/icons-material/NoteAdd";
import { ANALYTICS_EVENTS, trackEvent } from "../analytics/events";

export interface AdvisorRosterRow {
  id: string;
  name: string;
  readiness: number;
  lastLogin: string;
  interventions: number;
}

export interface AdvisorRosterTableProps {
  rows: AdvisorRosterRow[];
  onAssignAssessment?: (ids: string[]) => void;
  onAddNote?: (id: string) => void;
}

export const AdvisorRosterTable = ({ rows, onAssignAssessment, onAddNote }: AdvisorRosterTableProps) => {
  const handleAssign = (id: string) => {
    onAssignAssessment?.([id]);
    trackEvent({
      eventName: ANALYTICS_EVENTS.cohortAssessmentAssigned,
      persona: "advisor",
      contextPage: "/advisor/roster",
      adviseeId: id
    });
  };

  const handleAddNote = (id: string) => {
    onAddNote?.(id);
    trackEvent({
      eventName: ANALYTICS_EVENTS.advisorNoteAdded,
      persona: "advisor",
      contextPage: "/advisor/roster",
      adviseeId: id
    });
  };

  return (
    <Paper className="rounded-2xl shadow-xl" role="region" aria-label="Advisee roster">
      <TableContainer>
        <Table size="medium" aria-describedby="advisor-table-caption">
          <caption id="advisor-table-caption" className="sr-only">
            Advisor roster with readiness scores and quick actions
          </caption>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox inputProps={{ "aria-label": "Select all advisees" }} />
              </TableCell>
              <TableCell scope="col">Advisee</TableCell>
              <TableCell scope="col">Readiness</TableCell>
              <TableCell scope="col">Last login</TableCell>
              <TableCell scope="col">Interventions</TableCell>
              <TableCell scope="col" align="right">
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} hover role="row">
                <TableCell padding="checkbox">
                  <Checkbox inputProps={{ "aria-label": `Select ${row.name}` }} />
                </TableCell>
                <TableCell component="th" scope="row">
                  <Typography variant="body1" component="span">
                    {row.name}
                  </Typography>
                </TableCell>
                <TableCell>{row.readiness}</TableCell>
                <TableCell>{row.lastLogin}</TableCell>
                <TableCell>{row.interventions}</TableCell>
                <TableCell align="right">
                  <Box className="flex items-center justify-end gap-2">
                    <Tooltip title="Assign assessment">
                      <IconButton aria-label={`Assign assessment to ${row.name}`} onClick={() => handleAssign(row.id)}>
                        <AssignmentTurnedInIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Add note">
                      <IconButton aria-label={`Add note for ${row.name}`} onClick={() => handleAddNote(row.id)}>
                        <NoteAddIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};
